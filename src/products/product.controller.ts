import { Request, Response } from "express";
import prisma from "../prisma/client";
import ProductValidator, {
  ValidateCreateProduct,
  ValidatorUpdateProduct,
} from "./product.validator";

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

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { productName, productCode, price, stock, sku, categoryId } =
      req.body as ValidateCreateProduct;
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existingCategory) {
      return res.status(400).json({ message: "ไม่พบประเภทสินค้าที่ระบุ" });
    }
    const existingData = await prisma.product.findFirst({
      where: {
        sku: sku,
      },
    });
    if (existingData) {
      return res.status(400).json({ message: "มีสินค้าที่มี SKU นี้อยู่แล้ว" });
    }
    const newProduct = await prisma.product.create({
      data: {
        productName,
        productCode,
        price,
        stock,
        sku,
        category: { connect: { id: categoryId } },
      },
    });
    res.status(201).json({
      message: "เพิ่มข้อมูลสินค้าใหม่เสร็จสิ้น",
      newProduct: newProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการเพิ่มข้อมูลสินค้า" });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
        let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 5;
    const maxPage = 5;
    
    const totalProducts = await prisma.product.count();
    const totalPage = Math.min(Math.ceil(totalProducts / limit), maxPage);

    if (page > totalPage) page = totalPage;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    // aggregateRaw + join กับ category, productSetItem, productSet
    const products = await prisma.product.aggregateRaw({
      pipeline: [
        {
          $lookup: {
            from: "Category",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "ProductSetItem",
            localField: "_id",
            foreignField: "productId",
            as: "productSetItems",
          },
        },
        {
          $lookup: {
            from: "ProductSet",
            localField: "productSetItems.productSetId",
            foreignField: "_id",
            as: "productSets",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $project: { productSetItems: 0 } },
        { $skip: skip },
        { $limit: limit },
      ],
    });

    convertObjectIds(products);

    res.status(200).json({
      message: "ดึงข้อมูลสินค้าและความสัมพันธ์สำเร็จ",
      page,
      limit,
      totalPage,
      totalProducts,
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลสินค้า",
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; //เช็ค id ว่ามีป่าว
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        productSets: true,
      },
    });
    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้าที่ระบุ" });
    }
    res.status(200).json({ product: product });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลสินค้า" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData: ValidatorUpdateProduct =
      ProductValidator.UpdateProductValidator.parse(req.body);
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูลให้แก้ไข" });
    }
    const exsingProduct = await prisma.product.findUnique({ where: { id } });
    if (!exsingProduct) {
      return res.status(400).json({ message: "ไม่พบสินค้าที่ระบุ" });
    }

    const existingData = await prisma.product.findFirst({
      where: {
        id: { not: id },
        OR: [
          { productName: validatedData.productName },
          { productCode: validatedData.productCode },
          { sku: validatedData.sku },
        ],
      },
    });
    if (existingData) {
      return res.status(400).json({ message: "มีหมวดหมู่สินค้านี้อยู่แล้ว" });
    }
    const { productName, productCode, price, stock, sku, categoryId } =
      req.body;
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { productName, productCode, price, stock, sku, categoryId },
    });
    res.status(201).json({
      message: "แก้ไขข้อมูลสินค้าใหม่เสร็จสิ้น",
      updatedProduct: updatedProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการแก้ไขข้อมูลสินค้า" });
  }
};
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedProduct = await prisma.product.delete({
      where: { id: id },
    });
    res.status(200).json({
      message: "ลบสินค้าสำเร็จ",
      deletedProduct: deletedProduct,
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดระหว่างการลบสินค้า" });
  }
};
