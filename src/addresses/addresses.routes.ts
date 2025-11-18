import { Router } from "express";
import {

  editCustomerAddress,
  deleteAddressById,
} from "./addresses.controller";

const router = Router();


router.put("/edit/:id", editCustomerAddress);
router.delete("/delete/:id", deleteAddressById);
export default router;