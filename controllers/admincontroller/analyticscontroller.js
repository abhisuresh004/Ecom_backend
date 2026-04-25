import Order from "../../models/ordermodel.js";
import Product from "../../models/productmodel.js";
import User from "../../models/user.js";

export const getDashboardData = async (req, res) => {
  try {
    const ActiveOrders = await Order.countDocuments({
      status: { $in: ["Pending", "Processing", "Shipped", "orderplaced"] },
    });
    const totalusers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalProducts = await Product.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          total: { $sum: "$price" },
        },
      },
    ]);

    res.json({
      ActiveOrders,
      totalProducts,
      totalRevenue,
      totalusers,
    });
  } catch (e) {
    res.json({ message: "Error occurred", e });
  }
};

export const getRevenueanalytics = async (req, res) => {
  try {
    const { startdate, enddate } = req.query;

    let matchStage = {};

    // ✅ Optional date filter
    if (startdate && enddate) {
      matchStage.createdAt = {
        $gte: new Date(startdate),
        $lte: new Date(enddate),
      };
    }

    const analytics = await Order.aggregate([
      { $match: matchStage },

      {
        $facet: {
          // 🔹 Total stats
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$price" },
              },
            },
          ],

          // 🔹 Daily revenue (FIXED)
          dailyRevenue: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                revenue: { $sum: "$price" },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // 🔥 NEW: Monthly Revenue
          monthlyRevenue: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                revenue: { $sum: "$price" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    res.json(analytics[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const topProducts = await Order.aggregate([
      {
        $match: { status: "delivered" },
      },

      {
        $unwind: "$items",
      },

      // ✅ Convert product to ObjectId (handles string case safely)
      {
        $addFields: {
          productObjId: {
            $cond: {
              if: { $eq: [{ $type: "$items.product" }, "objectId"] },
              then: "$items.product",
              else: { $toObjectId: "$items.product" },
            },
          },
        },
      },

      // ✅ Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "productObjId",
          foreignField: "_id",
          as: "productData",
        },
      },

      // ✅ Convert array → object
      {
        $unwind: {
          path: "$productData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ Group by product
      {
        $group: {
          _id: "$productObjId",

          totalSold: { $sum: "$items.quantity" },

          // ✅ Revenue using product price (fallback 0)
          revenue: {
            $sum: {
              $multiply: [
                "$items.quantity",
                { $ifNull: ["$productData.price", 0] },
              ],
            },
          },

          name: { $first: "$productData.name" },
          price: { $first: "$productData.price" },
          image: { $first: "$productData.image" },
        },
      },

      // ✅ Sort by best selling
      {
        $sort: { totalSold: -1 },
      },

      // ✅ Limit results
      {
        $limit: Number(limit),
      },

      // ✅ Final response format
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: 1,
          price: 1,
          image: 1,
          totalSold: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      message: "Top products fetched successfully",
      topProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
