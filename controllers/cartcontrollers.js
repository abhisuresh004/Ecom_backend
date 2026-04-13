import Cart from "../models/cartmodel.js";

export const addToCart = async (req, res) => {
  try {
    const userid = req.user.userId;

    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({
      userId: userid,
    });

    if (cart) {
      const itemIndex = cart.cartitems.findIndex(
        (item) => item.productId && item.productId.toString() === productId,
      );

      if (itemIndex > -1) {
        cart.cartitems[itemIndex].quantity += quantity;
      } else {
        cart.cartitems.push({
          productId: productId,
          quantity,
        });
      }
    } else {
      cart = new Cart({
        userId: userid,
        cartitems: [{ productId: productId, quantity }],
      });
    }

    await cart.save();

    res.status(200).json({
      message: "Product added to cart successfully",
      cart,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Error adding product to cart",
      error: err.message,
    });
  }
};

export const getCart = async (req, res) => {
  try {
    const userid = req.user.userId;
    const cart = await Cart.findOne({ userId: userid }).populate(
      "cartitems.productId",
    );

    res.status(200).json(cart);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving cart", error: err.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userid = req.user.userId;
    const { productId } = req.params;
    console.log("Removing product from cart:", { userid, productId });
    const cart = await Cart.findOne({ userId: userid });
    if (cart) {
      cart.cartitems = cart.cartitems.filter(
        (item) => item.productId && item.productId.toString()!== productId,
      );
       await cart.save();
      res.json({ message: "Product removed from cart successfully", cart });
     
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    res.status(500).json({
      message: "Error removing product from cart",
      error: err.message,
    });
  }
};

export const updateCart = async (req, res) => {
  try {
    const userid = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await Cart.findOne({ userId: userid });
    if (cart) {
      const itemIndex = cart.cartitems.findIndex(
        (item) => item.productId.toString() === productId,
      );
       if (itemIndex === -1) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }
      if (quantity <= 0) {
        cart.cartitems.splice(itemIndex, 1);
      } else {
        cart.cartitems[itemIndex].quantity = quantity;
      }
      await cart.save();
      res.json({ message: "Cart updated successfully", cart });
    } else {
      res.status(404).json({ message: "Cart not found" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating cart", error: err.message });
  }
};

