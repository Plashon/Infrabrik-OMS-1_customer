import z from "zod";

const CategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryCode: z.string().min(1, "Category code is required"),
});

const UpdateCategorySchema = CategorySchema.partial();

const CategoryValidator = {
  CreateCategoryValidator: CategorySchema,
  UpdateCategoryValidator: UpdateCategorySchema,
};

export type ValidateCreateCategory = z.infer<
  (typeof CategoryValidator)["CreateCategoryValidator"]
>;

export type ValidatorUpdateCategory = z.infer<
  (typeof CategoryValidator)["UpdateCategoryValidator"]
>;

export default CategoryValidator;
