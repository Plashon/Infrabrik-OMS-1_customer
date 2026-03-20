import z from "zod";

const ProductSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productCode: z.string().min(1, "Product code is required"),
  price: z.number().min(0, "Price must be a positive number"),
  stock: z.number().int().min(0, "Stock must be a non-negative integer"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category ID is required"),
});

const UpdateProductSchema = ProductSchema.partial();

const ProductValidator = {
  CreateProductValidator: ProductSchema,
  UpdateProductValidator: UpdateProductSchema,
};

export type ValidateCreateProduct = z.infer<
  (typeof ProductValidator)["CreateProductValidator"]
>;

export type ValidatorUpdateProduct = z.infer<
  (typeof ProductValidator)["UpdateProductValidator"]
>;

export default ProductValidator;
