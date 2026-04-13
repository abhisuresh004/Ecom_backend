import Category from "../../models/adminmodel/category.js";
import Products from "../../models/productmodel.js";

export const addCategories = async (req, res) => {
  const { name } = req.body;
  try {
    const exsitingcategory = await Category.findOne({
      name: name.toLowerCase(),
    });
    if (exsitingcategory) {
      res.json({ message: "Existing Category" });
      return;
    }
    const category = await new Category({
      name: name.toLowerCase(),
      
    });

    await category.save();
    res.status(200).json({ message: "Category added", category });
  } catch (e) {
    res.json({ message: "Error occured", e });
  }
};

export const updatecategories = async (req, res) => {
  const { name, isActive } = req.body;
  const { id } = req.params;
  try {
    const cate = await Category.findByIdAndUpdate(
      id,
      { name: name.toLowerCase(), isActive },
      { new: true, runValidators: true },
    );
    res.status(200).json({ message: "Category Updated Successfully", cate });
  } catch (e) {
    res.json({ message: "Error Occured",e});
  }
};

export const Deletecategories = async (req, res) => {
  const products = await Products.find({ category: req.params.id });
  if (products.length > 0) {
    res.json({ message: "Category has associated products. Cannot delete." });
    return;
  }
 
  const { id } = req.params;
 

  try {
    const cate = await Category.findByIdAndDelete(id);
    res.status(200).json({ message: "Category Deleted Successfully", cate });
  } catch (e) {
    res.json({ message: "Error Occured", e });
  }
};

export const Getcategories = async (req, res) => {
  try {
    const cate = await Category.find();
    res.status(200).json({ message: "Category Fetched Successfully", cate });
  } catch (e) {
    res.json({ message: "Error Occured", e });
  }
};
