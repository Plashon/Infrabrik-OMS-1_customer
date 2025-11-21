import { Router } from "express";
import {
  createProductSet,
  getAllProductSet,
  getProductSetById,
  deleteProductSet,
  updateProductSet,
} from "./productSet.controller";

const router = Router();
router.post("/product-set/create", createProductSet);
router.get("/product-set/getAll", getAllProductSet);
router.get("/product-set/get/:id", getProductSetById);
router.put("/product-set/update/:id", updateProductSet);
router.delete("/product-set/delete/:id", deleteProductSet);

export default router;
