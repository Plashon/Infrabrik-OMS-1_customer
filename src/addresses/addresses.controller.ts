import { Request, Response } from "express";
import prisma from "../prisma/client";



export const deleteAddressById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });
    if (!existingAddress) {
      return res.status(404).json({ message: "ไม่พบที่อยู่ที่ระบุ" });
    }
    await prisma.address.delete({
      where: { id },
    });
    res.status(200).json({ message: "ลบที่อยู่เรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถลบที่อยู่ได้", error });
  }
};

export const editCustomerAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "กรุณาระบุ ID ที่อยู่" });
    }
    let {
      addressName,
      recipientName,
      recipientPhone,
      addressesInfo,
      zipcode,
      subdistrict,
      province,
      district,
    } = req.body;

    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return res.status(404).json({ message: "ไม่พบที่อยู่ที่ระบุ" });
    }

    // fallback values
    addressName = addressName?.trim() || existingAddress.addressName;
    recipientName = recipientName?.trim() || existingAddress.recipientName;
    recipientPhone = recipientPhone?.trim() || existingAddress.recipientPhone;
    addressesInfo = addressesInfo?.trim() || existingAddress.addressesInfo;
    zipcode = zipcode?.trim() || existingAddress.zipcode;
    subdistrict = subdistrict?.trim() || existingAddress.subdistrict;
    province = province?.trim() || existingAddress.province;
    district = district?.trim() || existingAddress.district;

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        addressName,
        recipientName,
        recipientPhone,
        addressesInfo,
        zipcode,
        subdistrict,
        province,
        district,
      },
    });

    res.status(200).json({
      message: "แก้ไขข้อมูลที่อยู่เรียบร้อย",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("Edit address error:", error);
    res.status(500).json({
      message: "ไม่สามารถแก้ไขข้อมูลที่อยู่ได้",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
