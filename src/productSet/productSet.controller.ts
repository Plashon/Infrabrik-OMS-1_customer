import { Request, Response } from "express";
import prisma from "../prisma/client";
import ProductSet, {
  ValidateCreateProductSet,
  ValidatorUpdateProductSet,
} from "./productSet.validator";

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

export const createProductSet = async (req: Request, res: Response) => {
  try {
    const { setName, setCode } = req.body as ValidateCreateProductSet;
    const existingData = await prisma.productSet.findFirst({
      where: {
        OR: [{ setName: setName, setCode: setCode }],
      },
    });
    if (existingData) {
      return res.status(400).json({ message: "มีเซ็ตสินค้าอยู่แล้ว" });
    }
    const newProductSet = await prisma.productSet.create({
      data: {
        setName,
        setCode,
      },
    });
    res.status(201).json({
      message: "เพิ่มเซ็ตสินค้าใหม่เสร็จสิ้น",
      newProductSet: newProductSet,
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดระหว่างการจัดเซ็ตสินค้า" });
  }
};

export const getAllProductSet = async (req: Request, res: Response) => {
  try {
     let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 5;
    const maxPage = 5;

    
    const totalSets = await prisma.productSet.count();
    const totalPage = Math.min(Math.ceil(totalSets / limit), maxPage);

    if (page > totalPage) page = totalPage;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const productSets = await prisma.productSet.aggregateRaw({
      pipeline: [
        {
          $lookup: {
            from: "ProductSetItem",
            localField: "_id",
            foreignField: "productSetId",
            as: "productItems",
          },
        },
        {
          $lookup: {
            from: "Product",
            localField: "productItems.productId",
            foreignField: "_id",
            as: "productItems",
          },
        },
        { $skip: skip },
        { $limit: limit },
      ],
    });

    convertObjectIds(productSets);

    res.status(200).json({
      message: "ดึงข้อมูลเซ็ตสินค้าและสินค้าในเซ็ตสำเร็จ",
      page,
      limit,
      totalPage,
      totalSets,
      productSets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการเรียกดูเซ็ตสินค้า",
    });
  }
};


export const getProductSetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productSet = await prisma.productSet.findUnique({
      where: { id: id },
      include: { productItems: true },
    });
    if (!productSet) {
      res.status(400).json({ message: "ไม่พบเซ็ตสินค้าที่ระบุ" });
    }
    res.status(200).json({ productSet: productSet });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการเรียกดูเซ็ตสินค้า" });
  }
};

export const updateProductSet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exsingProductSet = await prisma.productSet.findUnique({
      where: { id: id },
    });
    if (!exsingProductSet) {
      return res.status(400).json({ message: "ไม่พบเซ็ตสินค้าที่ระบุ" });
    }

    const validatedData: ValidatorUpdateProductSet =
      ProductSet.UpdateProductSetValidator.parse(req.body);
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูลให้แก้ไข" });
    }

    const exsitingData = await prisma.productSet.findFirst({
      where: {
        id: { not: id },
        OR: [
          { setName: validatedData.setName },
          { setCode: validatedData.setCode },
        ],
      },
    });
    if (exsitingData) {
      return res.status(400).json({ message: "มีเซ็ตสินค้านี้ยู่แล้ว" });
    }
    const { setName, setCode } = req.body;
    const updatedProductSet = await prisma.productSet.update({
      where: { id },
      data: { setName: setName, setCode: setCode },
    });
    res.status(200).json({
      message: "แก้ไขข้อมูเซ็ตสินค้าเรียบร้อย",
      updatedProductSet: updatedProductSet,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการแก้ไขเซ็ตสินค้า" });
  }
};

export const deleteProductSet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedData = await prisma.productSet.delete({
      where: { id: id },
    });
    res
      .status(200)
      .json({ message: "ลบเซ็ตสินค้าเสร็จสิ้น", deletedData: deletedData });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดระหว่างการลบเซ็ตสินค้า" });
  }
};
