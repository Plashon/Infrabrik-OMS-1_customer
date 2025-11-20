import { Request, Response } from "express";
import prisma from "../prisma/client";
import ProductValidator, {
  ValidateCreateProduct,
  ValidateCreateCategory,
  ValidateCreateProductSet,
  ValidateCreateProductSetItem,
  ValidatorUpdateProduct,
  ValidatorUpdateCategory,
  ValidatorUpdateProductSet,
  ValidatorUpdateProductSetItem,
} from "./product.validator";

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
    const categories = await prisma.category.findMany({
      include: {
        products: true,
      },
    });
    res.status(200).json({ categories: categories });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลหมวดหมู่สินค้า" });
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
    const validateData: ValidatorUpdateCategory =
      ProductValidator.UpdateCategoryValidator.parse(req.body);

    if (!validateData.categoryName && !validateData.categoryCode) {
      return res.status(400).json({ message: "ไม่มีข้อมูลให้แก้ไข" });
    }
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่สินค้าที่ระบุ" });
    }
    const existingData = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [
          validateData.categoryName
            ? { categoryName: validateData.categoryName }
            : undefined,
          validateData.categoryCode
            ? { categoryCode: validateData.categoryCode }
            : undefined,
        ].filter(Boolean) as any[],
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

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { productName, productCode, price, stock, sku, categoryId } =
      req.body as ValidateCreateProduct;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res
        .status(400)
        .json({ message: "หมวดหมู่สินค้าที่ระบุไม่มีอยู่จริง" });
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
        categoryId,
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
    const products = await prisma.product.findMany({
      include: {
        category: true,
        productSets: true,
      },
    });
    res.status(200).json({ products: products });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการดึงข้อมูลสินค้า" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    const productSets = await prisma.productSet.findMany({
      include: {
        productItems: true,
      },
    });
    res.status(200).json({ productSets: productSets });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการเรียกดูเซ็ตสินค้า" });
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
    const validatedData: ValidatorUpdateProductSet =
      ProductValidator.UpdateProductSetValidator.parse(req.body);
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูลให้แก้ไข" });
    }
    const exsingProductSet = await prisma.productSet.findUnique({
      where: { id: id },
    });
    if (!exsingProductSet) {
      return res.status(400).json({ message: "ไม่พบเซ็ตสินค้าที่ระบุ" });
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

export const createProductSetItem = async (req: Request, res: Response) => {
  try {
    const validateData: ValidateCreateProductSetItem =
      ProductValidator.CreateProductSetItemValidator.parse(req.body);
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
    const productSetItem = await prisma.productSetItem.findMany({
      include: {
        product: true, // ดึงข้อมูลสินค้า
        set: true, // ดึงข้อมูลเซ็ต
      },
    });
    if (productSetItem.length === 0) {
      res.status(400).json({ message: "ไม่มีสินค้าที่ถูกจัดเซ็ต" });
    }
    res.status(200).json({
      message: "ดึงข้อมูลสินค้าที่ถูกจัดเซ็ตสำเร็จ",
      productSetItem: productSetItem,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดระหว่างการเรียกดูสินค้าที่ถูกจัดเซ็ต" });
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
      ProductValidator.UpdateProductSetItemValidator.parse(req.body);

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
    const exsitingData = await prisma.productSetItem.findFirst({
      where: {
        id: { not: id },
        AND: [
          { productId: validatedData.productId },
          { productSetId: validatedData.productSetId },
        ],
      },
    });
    if (exsitingData) {
      return res.status(400).json({
        message:
          "มีสินค้านี้ในเซ็ตนี้อยู่แล้ว ไม่สามารถเพิ่มหรือแก้ไขให้ซ้ำได้",
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
