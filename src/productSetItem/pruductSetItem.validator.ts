import z from "zod";

const ProductSetItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productSetId: z.string().min(1, "Product Set ID is required"),
});

const UpdateProductSetItemSchema = ProductSetItemSchema.partial();

const ProductSetItemValidator = {
  CreateProductSetItemValidator: ProductSetItemSchema,
  UpdateProductSetItemValidator: UpdateProductSetItemSchema,
};

export type ValidateCreateProductSetItem = z.infer<
  (typeof ProductSetItemValidator)["CreateProductSetItemValidator"]
>;

export type ValidatorUpdateProductSetItem = z.infer<
  (typeof ProductSetItemValidator)["UpdateProductSetItemValidator"]
>;

export default ProductSetItemValidator;
