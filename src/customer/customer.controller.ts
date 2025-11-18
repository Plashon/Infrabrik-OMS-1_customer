import { Request, Response } from "express";
import prisma from "../prisma/client";

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
}) => {
  return await prisma.address.create({
    data,
  });
};
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export const createContactInformation = async (req: Request, res: Response) => {
  try {
    const {
      customerType,
      organizationType,
      customerCode,
      companyName,
      email,
      taxId,
      phoneNumber,
      profileImageUrl,
      addresses,
    } = req.body;
    if (organizationType === "HEAD_OFFICE") {
      if (!customerType || !customerCode || !companyName || !taxId) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }
      if (!customerType) {
        return res.status(400).json({ message: "กรุณากรอกประเภทลูกค้า" });
      }
      if (!customerCode) {
        return res.status(400).json({ message: "กรุณากรอกรหัสลูกค้า" });
      }
      if (!companyName) {
        return res.status(400).json({ message: "กรุณากรอกชื่อบริษัท" });
      }
      if (!taxId) {
        return res
          .status(400)
          .json({ message: "กรุณากรอกหมายเลขประจำตัวผู้เสียภาษี" });
      }
      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return res
          .status(400)
          .json({ message: "กรุณากรอกที่อยู่อย่างน้อย 1 รายการ" });
      }
      const exsitingCustomerCode = await prisma.customer.findFirst({
        where: { customerCode },
      });
      if (exsitingCustomerCode) {
        return res
          .status(400)
          .json({ message: "รหัสลูกค้านี้มีการใช้ในระบบแล้ว กรุณากรอกใหม่" });
      }
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
      }
      // สร้าง contact (ตัวอย่าง)
      const newCustomerInfo = await prisma.customer.create({
        data: {
          customerType,
          organizationType,
          customerCode,
          companyName,
          email,
          taxId,
          phoneNumber,
          profileImageUrl,
        },
      });

      const createdAddresses = await Promise.all(
        addresses.map((addr: any) =>
          createAddress({ ...addr, customerId: newCustomerInfo.id })
        )
      );

      res.status(201).json({
        message: "บันทึกข้อมูลติดต่อสำเร็จ",
        data: { customer: newCustomerInfo, addresses: createdAddresses },
      });
    } else if (organizationType === "BRANCH_OFFICE") {
      const { branchId, branchName } = req.body;
      if (!customerType || !customerCode || !companyName || !taxId) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }
      if (!customerType) {
        return res.status(400).json({ message: "กรุณากรอกประเภทลูกค้า" });
      }
      if (!customerCode) {
        return res.status(400).json({ message: "กรุณากรอกรหัสลูกค้า" });
      }
      if (!companyName) {
        return res.status(400).json({ message: "กรุณากรอกชื่อบริษัท" });
      }
      if (!taxId) {
        return res
          .status(400)
          .json({ message: "กรุณากรอกหมายเลขประจำตัวผู้เสียภาษี" });
      }
      if (!branchId) {
        return res.status(400).json({ message: "กรุณากรอกรหัสสาขา" });
      }
      if (!branchName) {
        return res.status(400).json({ message: "กรุณากรอกชื่อสาขา" });
      }
      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return res
          .status(400)
          .json({ message: "กรุณากรอกที่อยู่อย่างน้อย 1 รายการ" });
      }
      const exsitingCustomer = await prisma.customer.findFirst({
        where: { customerCode },
      });
      if (exsitingCustomer) {
        return res
          .status(400)
          .json({ message: "รหัสลูกค้านี้มีการใช้ในระบบแล้ว กรุณากรอกใหม่" });
      }
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
      }
      // สร้าง contact (ตัวอย่าง)
      const newCustomerInfo = await prisma.customer.create({
        data: {
          customerType,
          organizationType,
          customerCode,
          companyName,
          branchName,
          email,
          taxId,
          phoneNumber,
          profileImageUrl,
        },
      });

      const createdAddresses = await Promise.all(
        addresses.map((addr: any) =>
          createAddress({ ...addr, customerId: newCustomerInfo.id })
        )
      );

      res.status(201).json({
        message: "บันทึกข้อมูลติดต่อสำเร็จ",
        data: { customer: newCustomerInfo, addresses: createdAddresses },
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "ไม่สร้างมารถบันทึกข้อมูลติดต่อได้", error });
  }
};

export const getAllCustomers = async (req: Request, res: Response) => {
  console.log("test");
  try {
    const customers = await prisma.customer.findMany();
    console.log(customers);

    const customersWithAddresses = await Promise.all(
      customers.map(async (customer) => {
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
    res.status(200).json({ data: customer });
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
    const deletedCustomer = await prisma.customer.delete({
      where: { id },
    });

    res.status(200).json({
      message: "ลบข้อมูลลูกค้าสำเร็จ",
      data: {
        ...deletedCustomer,
        addresses: existingCustomer.addresses,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถลบข้อมูลลูกค้าได้", error });
  }
};

export const editCustomerInformation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let {
      customerType,
      organizationType,
      customerCode,
      companyName,
      email,
      taxId,
      phoneNumber,
      profileImageUrl,
    } = req.body;
    if (!id) {
      return res.status(400).json({ message: "กรุณาระบุ ID ลูกค้า" });
    }
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!existingCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้าที่ระบุ" });
    }

    if (organizationType === "HEAD_OFFICE") {
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
      }
      if (!customerCode || customerCode.trim() === "") {
        customerCode = existingCustomer.customerCode;
      }
      if (!companyName || companyName.trim() === "") {
        companyName = existingCustomer.companyName;
      }
      if (!taxId || taxId.trim() === "") {
        taxId = existingCustomer.taxId;
      }
      if (!customerType || customerType.trim() === "") {
        customerType = existingCustomer.customerType;
      }
      if (!organizationType || organizationType.trim() === "") {
        organizationType = existingCustomer.organizationType;
      }
      if (!phoneNumber || phoneNumber.trim() === "") {
        phoneNumber = existingCustomer.phoneNumber;
      }
      if (!profileImageUrl || profileImageUrl.trim() === "") {
        profileImageUrl = existingCustomer.profileImageUrl;
      }
      if (!email || email.trim() === "") {
        email = existingCustomer.email;
      }
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          customerType,
          organizationType,
          customerCode,
          companyName,
          email,
          taxId,
          phoneNumber,
          profileImageUrl,
        },
      });
      res.status(200).json({
        message: "แก้ไขข้อมูลลูกค้าสำเร็จ",
        data: updatedCustomer,
      });
    } else if (organizationType === "BRANCH_OFFICE") {
      let { branchId, branchName } = req.body;
      if (!branchId || branchId.trim() === "") {
        return res.status(400).json({ message: "กรุณากรอกรหัสสาขา" });
      }
      if (!branchName || branchName.trim() === "") {
        return res.status(400).json({ message: "กรุณากรอกชื่อสาขา" });
      }
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
      }
      if (!customerCode || customerCode.trim() === "") {
        customerCode = existingCustomer.customerCode;
      }
      if (!companyName || companyName.trim() === "") {
        companyName = existingCustomer.companyName;
      }
      if (!taxId || taxId.trim() === "") {
        taxId = existingCustomer.taxId;
      }
      if (!customerType || customerType.trim() === "") {
        customerType = existingCustomer.customerType;
      }
      if (!organizationType || organizationType.trim() === "") {
        organizationType = existingCustomer.organizationType;
      }
      if (!phoneNumber || phoneNumber.trim() === "") {
        phoneNumber = existingCustomer.phoneNumber;
      }
      if (!profileImageUrl || profileImageUrl.trim() === "") {
        profileImageUrl = existingCustomer.profileImageUrl;
      }
      if (!email || email.trim() === "") {
        email = existingCustomer.email;
      }
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          customerType,
          organizationType,
          customerCode,
          companyName,
          branchName,
          email,
          taxId,
          phoneNumber,
          profileImageUrl,
        },
      });
      res.status(200).json({
        message: "แก้ไขข้อมูลลูกค้าสำเร็จ",
        data: updatedCustomer,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถแก้ไขข้อมูลลูกค้าได้", error });
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
