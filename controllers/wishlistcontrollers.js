import Wishlist from "../models/wishlistmodel.js";

export const addToWishlist = async (req, res) => {

  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ userId: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: userId,
        products: [{ productId }],
      });
    }

   const exists = wishlist.products.some(
      (item) => item.productId.toString() === productId
    );

    if (exists) {
      return res
        .status(400)
        .json({ message: "Product already in wishlist" });
    }


    wishlist.products.push({productId});
      await wishlist.save();

    res.status(200).json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding product to wishlist", error });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = await Wishlist.findOne({ userId: userId }).populate(
      "products.productId",
    );

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving wishlist", error });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
   
    const wishlist = await Wishlist.findOne({ userId: userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.products = wishlist.products.filter(
      (item) =>item.productId.toString() !== productId,
    );
    await wishlist.save();

    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error removing product from wishlist", error });
  }
};
