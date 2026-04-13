import Review from "../models/reviewmodel.js";

export const Addreview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewNotes, rating } = req.body;
    const { id } = req.params;

    let review = await Review.findOne({ product: id });

    if (review) {
      const alreadyreviewed = review.reviews.find(
        (r) => r.user.toString() === userId,
      );
      if (alreadyreviewed) {
        return res
          .status(409)
          .json({ message: "You already reviewed this product" });
      }

      review.reviews.push({
        rating,
        reviewNotes,
        user: userId,
      });
      await review.save();
      res.status(200).json({ message: "Review Added" });
    } else {
      review = new Review({
        product: id,
        reviews: [{ reviewNotes: reviewNotes, rating: rating, user: userId }],
      });
      await review.save();
      res.status(200).json({ message: "Review Added", review });
    }
  } catch (e) {
    res.json({ message: "Error adding in review", e });
  }
};

export const Getreview = async (req, res) => {
  try {
    const { productId } = req.params;

    const review = await Review.find({ product: productId }).populate(
      "reviews.user",
      "name email",
    );

    res.status(200).json({
      count: review.length,
      review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

export const Deletereview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reviewid } = req.body;

    if (!id || !userId || !reviewid) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    let review = await Review.findOne({ product: id });
    if (!review) {
      return res
        .status(404)
        .json({ message: "Reviews not found for this product" });
    }
    const reviewexits = review.reviews.find(
      (r) => r._id.toString() === reviewid,
    );

    if (reviewexits) {
      const sameuser = review.reviews.find((r) => r.user.toString() === userId);

      if (!sameuser) {
        return res.status(403).json({
          message: "You can only delete your own review",
        });
      }

      review.reviews.pull(reviewid);

      await review.save();

      res.status(200).json({
        message: "Review deleted successfully",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting review",
      error: error.message,
    });
  }
};

// admin

export const DeleteAllreview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewId } = req.body;
    if (!id || !reviewId) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }
    let review = await Review.findOne({ product: id });
    if (!review) {
      return res
        .status(404)
        .json({ message: "Reviews not found for this product" });
    }
    review.reviews.find((r) => r._id.toString() === reviewId);
    if (review.reviews.length === 0) {
    await Review.deleteOne({ _id: review._id });

    return res.status(200).json({
      message: "Last review deleted, document removed",
    });
  }
    review.reviews.pull(reviewId);

    await review.save();
    res.status(200).json({ message: "Review Deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

export const Getallreview = async (req, res) => {
  try {
    const review = await Review.find()
      .populate("product")
      .populate("reviews.user", "name email");

    res.status(200).json({
      count: review.length,
      review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};

export const Getadminreview = async (req, res) => {
  try {
    const { productId } = req.params;

    const review = await Review.find({ product: productId }).populate(
      "reviews.user",
      "name email"
    );

    if (!review || review.length === 0) {
      return res.status(404).json({
        message: "No reviews for this product",
      });
    }

    // ✅ Fix here
    const filteredReviews = review.filter(
      (item) => item.reviews && item.reviews.length > 0
    );

    if (filteredReviews.length === 0) {
      return res.status(404).json({
        message: "No reviews for this product",
      });
    }

    res.status(200).json({
      count: filteredReviews.length,
      review: filteredReviews,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching reviews",
      error: error.message,
    });
  }
};