import { Request, Response } from "express";
import prisma from "../prisma/client";
import OrderValidator, {
  ValidateCreateOrder,
} from "./order.validator";
import { generateOrderNumber } from "../utils/orderNumberGenerator";
import { OrderStatus, PaymentMethod } from "@prisma/client";

const convertObjectIds = (doc: any) => {
  if (Array.isArray(doc)) {
    doc.forEach(convertObjectIds);
  } else if (typeof doc === "object" && doc !== null) {
    Object.keys(doc).forEach((key) => {
      const value = doc[key];
      if (typeof value === "object" && value !== null) {
        if ("$oid" in value) {
          doc[key] = value.$oid;
        } else {
          convertObjectIds(value);
        }
      }
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      addressId,
      items,
      discount = 0,
      paymentMethod,
    } = req.body as ValidateCreateOrder;

    if (!customerId || !addressId || !items || items.length === 0) {
      return res.status(400).json({
        message: "กรุณาระบุข้อมูลให้ครบถ้วน (ลูกค้า, ที่อยู่, สินค้า)",
      });
    }

    // ตรวจสอบว่าลูกค้ามีจริง
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }

    // ตรวจสอบว่าที่อยู่มีจริงและเป็นของลูกค้านี้
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) {
      return res.status(404).json({ message: "ไม่พบที่อยู่ที่ระบุ" });
    }
    if (address.customerId !== customerId) {
      return res.status(400).json({
        message: "ที่อยู่นี้ไม่ใช่ของลูกค้าที่ระบุ",
      });
    }

    // ดึงข้อมูลสินค้าและคำนวณ
    const orderItems = [];
    let totalPrice = 0;

    // ตรวจสอบว่าสินค้าทั้งหมดมีจริง
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    // ตรวจสอบว่าสินค้าทั้งหมดมีในฐานข้อมูล
    const foundProductIds = new Set(products.map((p) => p.id));
    const missingProductIds = productIds.filter(
      (id) => !foundProductIds.has(id)
    );

    if (missingProductIds.length > 0) {
      return res.status(404).json({
        message: "ไม่พบสินค้าที่ระบุ",
      });
    }

    // สร้าง map สำหรับค้นหาสินค้าเร็วขึ้น
    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    // คำนวณ subtotal และ totalPrice
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(404).json({
          message: `ไม่พบสินค้ารหัส ${item.productId}`,
        });
      }

      const subtotal = product.price * item.quantity;
      totalPrice += subtotal;

      orderItems.push({
        productId: item.productId,
        productName: product.productName,
        price: product.price,
        quantity: item.quantity,
        subtotal,
      });
    }

    // คำนวณ finalPrice
    const finalPrice = totalPrice - discount;

    // สร้าง orderNumber
    const orderNumber = await generateOrderNumber();

    // เตรียม shippingAddress จาก Address
    const shippingAddress = {
      addressName: address.addressName,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressesInfo: address.addressesInfo,
      zipcode: address.zipcode,
      subdistrict: address.subdistrict,
      province: address.province,
      district: address.district,
    };

    // สร้าง Order พร้อม OrderItems
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        shippingAddress: shippingAddress as any,
        totalPrice,
        discount,
        finalPrice,
        status: OrderStatus.PENDING,
        paymentMethod: paymentMethod as PaymentMethod,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            customerCode: true,
          },
        },
      },
    });

    res
      .status(201)
      .json({ message: "สร้างคำสั่งซื้อสำเร็จ", newOrder: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการสร้างคำสั่งซื้อ",
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate input
    const parsed = OrderValidator.UpdateOrderStatusValidator.safeParse(
      req.body
    );
    if (!parsed.success) {
      return res.status(400).json({
        message: "ข้อมูลไม่ถูกต้อง",
        errors: parsed.error.format(),
      });
    }

    const { status: newStatus } = parsed.data;

    // ดึง Order ปัจจุบัน
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อที่ระบุ" });
    }

    const currentStatus = order.status;

    // ตรวจสอบ: ยกเลิกไม่ได้ ถ้าเป็น SHIPPED หรือ COMPLETED
    if (newStatus === OrderStatus.CANCELED) {
      if (
        currentStatus === OrderStatus.SHIPPED ||
        currentStatus === OrderStatus.COMPLETED
      ) {
        return res.status(400).json({
          message:
            "ไม่สามารถยกเลิกคำสั่งซื้อที่อยู่ในสถานะ SHIPPED หรือ COMPLETED",
        });
      }
    }

    // ตรวจสอบ: ห้ามข้ามสถานะ
    const statusFlow: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
      [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [], // ไม่สามารถเปลี่ยนสถานะได้
      [OrderStatus.CANCELED]: [], // ไม่สามารถเปลี่ยนสถานะได้
    };

    const allowedStatuses = statusFlow[currentStatus];
    if (!allowedStatuses.includes(newStatus as OrderStatus)) {
      return res.status(400).json({
        message: `ไม่สามารถเปลี่ยนสถานะจาก ${currentStatus} เป็น ${newStatus}`,
      });
    }

    // อัปเดตสถานะ
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: newStatus as OrderStatus },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            customerCode: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "อัปเดตสถานะคำสั่งซื้อสำเร็จ",
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการอัปเดตสถานะ",
    });
  }
};

/**
 * ดึงรายการ Order ของลูกค้า
 * - ดึงรายการ order+items
 * - รวมจำนวน order
 * - รวมยอดเงินทั้งหมดที่เคยใช้ (aggregateRaw)
 */
export const getCustomerOrders = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    // ตรวจสอบว่าลูกค้ามีจริง
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }

    // ดึงรายการ order+items
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // ใช้ aggregateRaw เพื่อรวมจำนวน order และยอดเงินทั้งหมด
    const summary = await prisma.order.aggregateRaw({
      pipeline: [
        {
          $match: {
            customerId: { $oid: customerId },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$finalPrice" },
          },
        },
      ],
    });

    convertObjectIds(summary);

    const summaryData =
      Array.isArray(summary) && summary.length > 0
        ? {
            totalOrders: (summary[0] as any)?.totalOrders || 0,
            totalAmount: (summary[0] as any)?.totalAmount || 0,
          }
        : { totalOrders: 0, totalAmount: 0 };

    res.status(200).json({
      message: "ดึงข้อมูลคำสั่งซื้อสำเร็จ",
      data: {
        customer: {
          id: customer.id,
          companyName: customer.companyName,
          customerCode: customer.customerCode,
        },
        summary: summaryData,
        orders,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลคำสั่งซื้อ",
    });
  }
};

/**
 * รายงาน: ยอดขายรายวัน / รายเดือน
 * ใช้ aggregateRaw กับ $group, $sum, $match
 */
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { period = "month" } = req.query; // 'day' or 'month'

    let dateFormat: any;
    let dateField: string;

    if (period === "day") {
      // รายวัน: กลุ่มตาม YYYY-MM-DD
      dateFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
        },
      };
      dateField = "date";
    } else {
      // รายเดือน: กลุ่มตาม YYYY-MM
      dateFormat = {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt",
        },
      };
      dateField = "month";
    }

    const salesReport = await prisma.order.aggregateRaw({
      pipeline: [
        {
          $match: {
            status: {
              $ne: "CANCELED", // ไม่นับคำสั่งซื้อที่ยกเลิก
            },
          },
        },
        {
          $group: {
            _id: dateFormat,
            totalSales: { $sum: "$finalPrice" },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: "$finalPrice" },
          },
        },
        {
          $sort: { _id: -1 }, // เรียงตามวันที่/เดือนล่าสุด
        },
        {
          $project: {
            _id: 0,
            [dateField]: "$_id",
            totalSales: 1,
            totalOrders: 1,
            averageOrderValue: { $round: ["$averageOrderValue", 2] },
          },
        },
      ],
    });

    convertObjectIds(salesReport);

    res.status(200).json({
      message: `ดึงรายงานยอดขาย${
        period === "day" ? "รายวัน" : "รายเดือน"
      }สำเร็จ`,
      period,
      data: salesReport,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงรายงานยอดขาย",
    });
  }
};

/**
 * รายงาน: จำนวนออเดอร์ในแต่ละเดือน
 * ใช้ aggregateRaw กับ $group, $sum
 */
export const getOrdersByMonth = async (req: Request, res: Response) => {
  try {
    const ordersByMonth = await prisma.order.aggregateRaw({
      pipeline: [
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: "$createdAt",
              },
            },
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
              },
            },
            paidOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "PAID"] }, 1, 0],
              },
            },
            shippedOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "SHIPPED"] }, 1, 0],
              },
            },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0],
              },
            },
            canceledOrders: {
              $sum: {
                $cond: [{ $eq: ["$status", "CANCELED"] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { _id: -1 }, // เรียงตามเดือนล่าสุด
        },
        {
          $project: {
            _id: 0,
            month: "$_id",
            totalOrders: 1,
            pendingOrders: 1,
            paidOrders: 1,
            shippedOrders: 1,
            completedOrders: 1,
            canceledOrders: 1,
          },
        },
      ],
    });

    convertObjectIds(ordersByMonth);

    res.status(200).json({
      message: "ดึงรายงานจำนวนออเดอร์ในแต่ละเดือนสำเร็จ",
      data: ordersByMonth,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงรายงานจำนวนออเดอร์",
    });
  }
};

/**
 * รายงาน: Top 5 ลูกค้าที่จ่ายเยอะที่สุด
 * ใช้ aggregateRaw กับ $group, $sum, $sort, $limit
 */
export const getTopCustomers = async (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit as string, 10) || 5;

    const topCustomers = await prisma.order.aggregateRaw({
      pipeline: [
        {
          $match: {
            status: {
              $ne: "CANCELED", // ไม่นับคำสั่งซื้อที่ยกเลิก
            },
          },
        },
        {
          $group: {
            _id: "$customerId",
            totalSpent: { $sum: "$finalPrice" },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: "$finalPrice" },
          },
        },
        {
          $sort: { totalSpent: -1 }, // เรียงตามยอดจ่ายมากที่สุด
        },
        {
          $limit: limitNum,
        },
        {
          $lookup: {
            from: "Customer",
            localField: "_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            customerId: "$_id",
            customerName: "$customer.companyName",
            customerCode: "$customer.customerCode",
            totalSpent: 1,
            totalOrders: 1,
            averageOrderValue: { $round: ["$averageOrderValue", 2] },
          },
        },
      ],
    });

    convertObjectIds(topCustomers);

    res.status(200).json({
      message: `ดึงรายงาน Top ${limitNum} ลูกค้าที่จ่ายเยอะที่สุดสำเร็จ`,
      data: topCustomers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงรายงาน Top Customers",
    });
  }
};
