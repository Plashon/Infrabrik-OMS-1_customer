import { Request, Response } from "express";
import prisma from "../prisma/client";
import ProductSetItemValidator, {
  ValidateCreateProductSetItem,
  ValidatorUpdateProductSetItem,
} from "./pruductSetItem.validator";

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

export const createProductSetItem = async (req: Request, res: Response) => {
  try {
    const validateData: ValidateCreateProductSetItem =
      ProductSetItemValidator.CreateProductSetItemValidator.parse(req.body);
    const { productId, productSetId } = validateData;
    const exsitingData = await prisma.productSetItem.findFirst({
      where: {
        AND: [{ productId, productSetId }],
      },
    });
    if (exsitingData) {
      return res
        .status(400)
        .json({ message: "สินค้านี้ถูกจัดเข้าเซ็ตนี้แล้ว" });
    }
    const newItem = await prisma.productSetItem.create({
      data: {
        productId,
        productSetId,
      },
    });
    res
      .status(201)
      .json({ message: "เพิ่มสินค้าเข้าเซ็ตสำเร็จ", newItem: newItem });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการจัดสินค้าเข้าเซ็ต" });
  }
};

export const getAllProductSetItems = async (req: Request, res: Response) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 5;
    const maxPage = 5;

    const totalItems = await prisma.productSetItem.count();
    const totalPage = Math.min(Math.ceil(totalItems / limit), maxPage);

    if (page > totalPage) page = totalPage;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const productSetItems = await prisma.productSetItem.aggregateRaw({
      pipeline: [
        {
          $lookup: {
            from: "Product",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $lookup: {
            from: "ProductSet",
            localField: "productSetId",
            foreignField: "_id",
            as: "set",
          },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$set", preserveNullAndEmptyArrays: true } },
        { $skip: skip },
        { $limit: limit },
      ],
    });

    if (productSetItems.length === 0) {
      return res.status(400).json({ message: "ไม่มีสินค้าที่ถูกจัดเซ็ต" });
    }

    convertObjectIds(productSetItems);

    res.status(200).json({
      message: "ดึงข้อมูลสินค้าที่ถูกจัดเซ็ตสำเร็จ",
      page,
      limit,
      totalPage,
      totalItems,
      productSetItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการเรียกดูสินค้าที่ถูกจัดเซ็ต",
    });
  }
};

export const getProductSetItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const productSetItem = await prisma.productSetItem.findUnique({
      where: { id },
      include: {
        product: true,
        set: true,
      },
    });

    if (!productSetItem) {
      return res.status(404).json({
        message: "ไม่พบสินค้าที่ถูกจัดเซ็ตที่ระบุ",
      });
    }

    res.status(200).json({
      message: "ดึงข้อมูลสินค้าที่ถูกจัดเซ็ตสำเร็จ",
      productSetItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการเรียกดูสินค้าที่ถูกจัดเซ็ต",
    });
  }
};

export const updateProductSetItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const validatedData: ValidatorUpdateProductSetItem =
      ProductSetItemValidator.UpdateProductSetItemValidator.parse(req.body);

    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({
        message: "ไม่มีข้อมูลให้แก้ไข",
      });
    }
    const existing = await prisma.productSetItem.findUnique({
      where: { id: id },
    });
    if (!existing) {
      return res.status(404).json({
        message: "ไม่พบเซ็ตสินค้าที่ระบุ",
      });
    }

    const { productId, productSetId } = req.body;
    const updateProductSetItem = await prisma.productSetItem.update({
      where: { id },
      data: { productId, productSetId },
    });
    res.status(400).json({
      message: "อัปเดตสินค้านี้ในเซ็ตเรียบร้อย",
      updateDate: updateProductSetItem,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการแก้ไขสินค้าในเซ็ต",
    });
  }
};

export const deleteProductSetItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingData = await prisma.productSetItem.findUnique({
      where: { id },
    });

    if (!existingData) {
      return res.status(404).json({
        message: "ไม่พบสินค้าที่ถูกจัดเซ็ตที่ต้องการลบ",
      });
    }
    await prisma.productSetItem.delete({
      where: { id },
    });

    res.status(200).json({
      message: "ลบสินค้าที่ถูกจัดเซ็ตสำเร็จ",
    });
  } catch (error) {
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการลบสินค้าที่ถูกจัดเซ็ต",
    });
  }
};
