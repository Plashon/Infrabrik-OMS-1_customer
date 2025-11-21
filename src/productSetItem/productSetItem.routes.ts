import { Router } from "express";
import {
  createProductSetItem,
  getAllProductSetItems,
  getProductSetItemById,
  deleteProductSetItem,
  updateProductSetItem,
} from "./productSetItem.controller";

const router = Router();

router.post("/set-item/create", createProductSetItem);
router.get("/set-item/getAll", getAllProductSetItems);
router.get("/set-item/get/:id", getProductSetItemById);
router.put("/set-item/update/:id", updateProductSetItem);
router.delete("/set-item/delete/:id", deleteProductSetItem);

export default router;
