import { Request, Response } from "express";
import prisma from "../prisma/client";
import {
  CustomerValidator,
  ValidateCreateCustomer,
  HeadOfficeType,
  BranchOfficeType,
  CustomerTypeSafe,
  ValidateUpdateCustomer,
} from "./customer.validator";
import { CustomerType, OrganizationType } from "@prisma/client";

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



// Email format check
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Helper: เตรียมข้อมูลลูกค้าสำหรับ Prisma
const prepareCustomerData = (
  customerData: CustomerTypeSafe
): {
  customerType: CustomerType;
  organizationType: OrganizationType;
  customerCode: string;
  companyName: string;
  email: string;
  taxId: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  branchName?: string | null;
} => {
  const baseData = {
    customerType: customerData.customerType as CustomerType,
    organizationType: customerData.organizationType as OrganizationType,
    customerCode: customerData.customerCode,
    companyName: customerData.companyName,
    email: customerData.email,
    taxId: customerData.taxId,
    phoneNumber: customerData.phoneNumber,
    profileImageUrl: customerData.profileImageUrl,
  };

  if (customerData.organizationType === "BRANCH_OFFICE") {
    const branchData = customerData as BranchOfficeType;
    return {
      ...baseData,
      branchName: branchData.branchName,
    };
  }

  // HEAD_OFFICE
  return {
    ...baseData,
    branchName: null,
  };
};

// Helper: sanitize customer data (ลบ branchName ถ้าเป็น null)
const sanitizeCustomer = (customer: any) => {
  if (customer.branchName === null) {
    const { branchName, ...rest } = customer;
    return rest;
  }
  return customer;
};

export const createContactInformation = async (req: Request, res: Response) => {
  try {
    // Validate customer input
    const parsed = CustomerValidator.validateCreateCustomer.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "ข้อมูลลูกค้าไม่ถูกต้อง",
        errors: parsed.error.format(),
      });
    }

    const customerData: CustomerTypeSafe = parsed.data;

    // ตรวจสอบรหัสลูกค้าซ้ำ
    const existingCustomer = await prisma.customer.findFirst({
      where: { customerCode: customerData.customerCode },
    });
    if (existingCustomer) {
      return res
        .status(400)
        .json({ message: "รหัสลูกค้านี้มีการใช้ในระบบแล้ว กรุณากรอกใหม่" });
    }

    // ตรวจสอบ email format
    if (customerData.email && !isValidEmail(customerData.email)) {
      return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
    }

    // เตรียมข้อมูลลูกค้า
    const preparedCustomerData = prepareCustomerData(customerData);

    // สร้างลูกค้าพร้อม addresses
    const newCustomer = await prisma.customer.create({
      data: {
        ...preparedCustomerData,
        addresses: {
          create: customerData.addresses,
        },
      },
      include: {
        addresses: true,
      },
    });

    // Sanitize customer data (ลบ branchName ถ้าเป็น null)
    const sanitizedCustomer = sanitizeCustomer(newCustomer);

    res.status(201).json({
      message: "บันทึกข้อมูลติดต่อสำเร็จ",
      data: {
        customer: sanitizedCustomer,
        addresses: newCustomer.addresses,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสร้างลูกค้า",
    });
  }
};

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 5;
    const maxPage = 5;

    const totalCustomers = await prisma.customer.count();
    const totalPage = Math.min(Math.ceil(totalCustomers / limit), maxPage);

    if (page > totalPage) page = totalPage;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const customers = await prisma.customer.aggregateRaw({
      pipeline: [
        {
          $lookup: {
            from: "Address",
            localField: "_id",
            foreignField: "customerId",
            as: "addresses",
          },
        },
        { $skip: skip },
        { $limit: limit },
      ],
    });

    convertObjectIds(customers);

    res.status(200).json({
      message: "ดึงข้อมูลลูกค้าสำเร็จ",
      page,
      limit,
      totalPage,
      totalCustomers,
      customers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการเรียกดูลูกค้า",
    });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { addresses: true },
    });
    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }
    let sanitizedCustomer;

    if (customer.branchName === null) {
      // ลบ branchName ออกจาก object
      const { branchName, ...rest } = customer;
      sanitizedCustomer = rest;
    } else {
      sanitizedCustomer = customer;
    }
    res.status(200).json({ data: sanitizedCustomer });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลลูกค้าได้", error });
  }
};

export const deleteCustomerInformation = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "กรุณาระบุ ID ลูกค้า" });
    }

    // ตรวจว่ามีลูกค้าไหม + ดึง addresses
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: { addresses: true },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }

    // ลบ Address ทั้งหมดก่อน (เพราะมี foreign key)
    await prisma.address.deleteMany({
      where: { customerId: id },
    });

    // ลบ customer
    await prisma.customer.delete({
      where: { id },
    });

    res.status(200).json({
      message: "ลบข้อมูลลูกค้าสำเร็จ",
    });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถลบข้อมูลลูกค้าได้", error });
  }
};

export const editCustomerInformation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "กรุณาระบุ ID ลูกค้า" });
    }

    // Validate input
    const parsed = CustomerValidator.validateUpdateCustomer.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        errors: parsed.error.format(),
      });
    }

    const updateData: ValidateUpdateCustomer = parsed.data;

    // ตรวจว่าลูกค้ามีอยู่
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!existingCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }

    // ตรวจ email format
    if (updateData.email && !isValidEmail(updateData.email)) {
      return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
    }

    const prismaUpdateData: any = { ...updateData };

    // map enum fields
    if (updateData.customerType) {
      prismaUpdateData.customerType = updateData.customerType as CustomerType;
    }
    if (updateData.organizationType) {
      prismaUpdateData.organizationType =
        updateData.organizationType as OrganizationType;
    }

    // ลบ addresses ออกถ้ามี
    if (prismaUpdateData.addresses) {
      delete prismaUpdateData.addresses;
    }

    // Logic เปลี่ยน organizationType
    if (
      existingCustomer.organizationType === "BRANCH_OFFICE" &&
      updateData.organizationType === "HEAD_OFFICE"
    ) {
      // เปลี่ยน BRANCH → HEAD ลบ branchName
      prismaUpdateData.branchName = null;
    }

    if (
      existingCustomer.organizationType === "HEAD_OFFICE" &&
      updateData.organizationType === "BRANCH_OFFICE"
    ) {
      // ต้องกรอก branchId และ branchName
      if (!updateData.branchId || !updateData.branchName) {
        return res.status(400).json({
          message:
            "เมื่อเปลี่ยนเป็น BRANCH_OFFICE ต้องกรอก branchId และ branchName",
        });
      }

      // branchId ใช้แค่ validate ไม่ส่งเข้า Prisma
      delete prismaUpdateData.branchId 
      prismaUpdateData.branchName = updateData.branchName;      
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: prismaUpdateData,
    });

    res.status(200).json({
      message: "แก้ไขข้อมูลลูกค้าสำเร็จ",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "ไม่สามารถแก้ไขข้อมูลลูกค้าได้",
      error,
    });
  }
};

export const getAllAddressesByCustomerId = async (
  req: Request,
  res: Response
) => {
  try {
    const { customerId } = req.params;
    const exsitingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!exsitingCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }
    const addresses = await prisma.address.findMany({
      where: { customerId },
    });
    res.status(200).json({ data: addresses });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลที่อยู่ได้", error });
  }
};

export const createAddressForCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const {
      addressName,
      recipientName,
      recipientPhone,
      addressesInfo,
      zipcode,
      subdistrict,
      province,
      district,
    } = req.body;

    const exsitingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!exsitingCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }
    if (
      !addressName ||
      !recipientName ||
      !recipientPhone ||
      !addressesInfo ||
      !zipcode ||
      !subdistrict ||
      !province ||
      !district
    ) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    const newAddress = await prisma.address.create({
      data: {
        addressName,
        recipientName,
        recipientPhone,
        addressesInfo,
        zipcode,
        subdistrict,
        province,
        district,
        customerId,
      },
    });
    res.status(201).json({ data: newAddress });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถสร้างที่อยู่ได้", error });
  }
};
