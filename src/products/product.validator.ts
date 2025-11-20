import z from "zod";

const CategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryCode: z.string().min(1, "Category code is required"),
});
const ProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productCode: z.string().min(1, "Product code is required"),
  price: z.number().min(0, "Price must be a positive number"),
  stock: z.number().int().min(0, "Stock must be a non-negative integer"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category ID is required"),
});
const ProductSetSchema = z.object({
  setName: z.string().min(1, "Set name is required"),
  setCode: z.string().min(1, "Set code is required"),
});
const ProductSetItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productSetId: z.string().min(1, "Product Set ID is required"),
});

const UpdateProductSchema = ProductSchema.partial();
const UpdateCategorySchema = CategorySchema.partial();
const UpdateProductSetSchema = ProductSetSchema.partial();
const UpdateProductSetItemSchema = ProductSetItemSchema.partial();

const ProductValidator = {
  CreateProductValidator: ProductSchema,
  CreateCategoryValidator: CategorySchema,
  CreateProductSetValidator: ProductSetSchema,
  CreateProductSetItemValidator: ProductSetItemSchema,
  UpdateProductValidator: UpdateProductSchema,
  UpdateCategoryValidator: UpdateCategorySchema,
  UpdateProductSetValidator: UpdateProductSetSchema,
  UpdateProductSetItemValidator: UpdateProductSetItemSchema,
};

export type ValidateCreateProduct = z.infer<
  (typeof ProductValidator)["CreateProductValidator"]
>;
export type ValidateCreateCategory = z.infer<
  (typeof ProductValidator)["CreateCategoryValidator"]
>;
export type ValidateCreateProductSet = z.infer<
  (typeof ProductValidator)["CreateProductSetValidator"]
>;
export type ValidateCreateProductSetItem = z.infer<
  (typeof ProductValidator)["CreateProductSetItemValidator"]
>;
export type ValidatorUpdateProduct = z.infer<
  (typeof ProductValidator)["UpdateProductValidator"]
>;
export type ValidatorUpdateCategory = z.infer<
  (typeof ProductValidator)["UpdateCategoryValidator"]
>;
export type ValidatorUpdateProductSet = z.infer<
  (typeof ProductValidator)["UpdateProductSetValidator"]
>;
export type ValidatorUpdateProductSetItem = z.infer<
  (typeof ProductValidator)["UpdateProductSetItemValidator"]
>;

export default ProductValidator;
