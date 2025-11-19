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
import { de } from "zod/v4/locales";

// Helper: create address
const createAddress = async (data: {
  addressName: string;
  recipientName: string;
  recipientPhone: string;
  addressesInfo: string;
  zipcode: string;
  subdistrict: string;
  province: string;
  district: string;
  customerId: string;
}) => prisma.address.create({ data });

// Email format check (optional)
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

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

    // แยก addresses และเตรียมข้อมูลลูกค้า
    const { addresses } = customerData;

    let preparedCustomerData: any;
    if (customerData.organizationType === "BRANCH_OFFICE") {
      // Cast เป็น BranchOfficeType
      const branchData = customerData as ValidateCreateCustomer &
        BranchOfficeType;

      // ตรวจสอบ branchId
      if (!branchData.branchId) {
        return res.status(400).json({ message: "กรุณากรอก branchId" });
      }

      preparedCustomerData = {
        ...branchData,
        customerType: branchData.customerType as CustomerType,
        organizationType: branchData.organizationType as OrganizationType,
        branchName: branchData.branchName,
      };
      // ไม่ส่ง branchId เข้า Prisma เพราะ table ไม่มี field นี้
      delete preparedCustomerData.branchId;
    } else {
      // HEAD_OFFICE
      const headData = customerData as ValidateCreateCustomer & HeadOfficeType;
      preparedCustomerData = {
        ...headData,
        customerType: headData.customerType as CustomerType,
        organizationType: headData.organizationType as OrganizationType,
      };
    }

    await prisma.customer.create({
      data: {
        ...preparedCustomerData,
        addresses: {
          create: addresses, // ต้องเป็น nested create
        },
      },
    });

    const newCustomer = await prisma.customer.create({
      data: {
        ...preparedCustomerData,
        addresses: {
          create: addresses.map((addr) => ({
            addressName: addr.addressName,
            recipientName: addr.recipientName,
            recipientPhone: addr.recipientPhone,
            addressesInfo: addr.addressesInfo,
            zipcode: addr.zipcode,
            subdistrict: addr.subdistrict,
            province: addr.province,
            district: addr.district,
          })),
        },
      },
      include: {
        addresses: true,
      },
    });

    const createdAddresses = newCustomer.addresses;

    res.status(201).json({
      message: "บันทึกข้อมูลติดต่อสำเร็จ",
      data: { customer: newCustomer, addresses: createdAddresses },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสร้างลูกค้า",
      error,
    });
  }
};

export const getAllCustomers = async (req: Request, res: Response) => {
  console.log("test");
  try {
    const customers = await prisma.customer.findMany();

    const sanitizedCustomers = customers.map(({ branchName, ...rest }) =>
      branchName === null ? rest : { ...rest, branchName }
    );
    const customersWithAddresses = await Promise.all(
      sanitizedCustomers.map(async (customer) => {
        const addresses = await prisma.address.findMany({
          where: { customerId: customer.id },
        });
        return { ...customer, addresses };
      })
    );
    res.status(200).json({ data: customersWithAddresses });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลลูกค้าได้", error });
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
