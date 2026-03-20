import { Request, Response } from "express";
import prisma from "../prisma/client";

import CategoryValidator, {
  ValidateCreateCategory,
  ValidatorUpdateCategory,
} from "./category.validator";

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

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { categoryName, categoryCode } = req.body as ValidateCreateCategory;
    const existingData = await prisma.category.findFirst({
      where: {
        OR: [{ categoryName: categoryName }, { categoryCode: categoryCode }],
      },
    });
    if (existingData) {
      return res.status(400).json({ message: "มีหมวดหมู่สินค้านี้อยู่แล้ว" });
    }
    const newCategory = await prisma.category.create({
      data: {
        categoryName,
        categoryCode,
      },
    });
    res.status(201).json({
      message: "เพิ่มข้อมูลหมวดหมู่สินค้าใหม่เสร็จสิ้น",
      newCategory: newCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการเพิ่มข้อมูลหมวดหมู่สินค้า" });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {

    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 5;
    const maxPage = 5;

    // นับจำนวนรายการทั้งหมด
    const totalItems = await prisma.category.count();
    const totalPage = Math.min(Math.ceil(totalItems / limit), maxPage);

    // ตรวจสอบให้ page ไม่เกิน totalPage
    if (page > totalPage) page = totalPage;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const categories = await prisma.category.aggregateRaw({
      pipeline: [
        {
          $lookup: {
            from: "Product",
            localField: "_id",
            foreignField: "categoryId",
            as: "products",
          },
        },
        { $skip: skip },
        { $limit: limit },
      ],
    });

    convertObjectIds(categories);

    res.status(200).json({
      message: "ดึงข้อมูลหมวดหมู่สินค้าเรียบร้อย",
      page,
      limit,
      totalPage,
      totalItems,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลหมวดหมู่สินค้า",
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: id },
      include: {
        products: true,
      },
    });
    if (!category) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่สินค้าที่ระบุ" });
    }
    res.status(200).json({ category: category });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลหมวดหมู่สินค้า" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่สินค้าที่ระบุ" });
    }

    const validateData: ValidatorUpdateCategory =
      CategoryValidator.UpdateCategoryValidator.parse(req.body);

    const existingData = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [
          { categoryName: validateData.categoryName },
          { categoryCode: validateData.categoryCode },
        ],
      },
    });
    if (existingData) {
      return res.status(400).json({ message: "มีหมวดหมู่สินค้านี้อยู่แล้ว" });
    }

    const dataForUpdate: any = {};
    if (validateData.categoryName)
      dataForUpdate.categoryName = validateData.categoryName;
    if (validateData.categoryCode)
      dataForUpdate.categoryCode = validateData.categoryCode;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: dataForUpdate,
    });
    res.status(200).json({
      message: "แก้ไขหมวดหมู่สำเร็จ",
      data: updatedCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการแก้ไขข้อมูลหมวดหมู่สินค้า" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exsitingData = await prisma.category.findUnique({
      where: { id },
    });
    if (!exsitingData) {
      return res.status(400).json({ message: "ไม่พบหมวดหมู่สินค้าที่ระบุ" });
    }
    const deletedCategory = await prisma.category.delete({
      where: { id: id },
    });
    res.status(200).json({
      message: "ลบหมวดหมู่สินค้าสำเร็จ",
      deletedCategory: deletedCategory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการลบหมวดหมู่สินค้า" });
  }
};
