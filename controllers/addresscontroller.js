import Address from "../models/addressmodel.js";

export const Addaddress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { address, pincode, landmark } = req.body;

    const existingaddress = await Address.findOne({ userId });
    if (existingaddress) {
      await existingaddress.addressess.push({
        address,
        pincode,
        landmark,
      });
      await existingaddress.save();
      return res
        .status(200)
        .json({ message: "Address Addesd Succefully", existingaddress });
    }
    const Addressdetails = new Address({
      userId: userId,
      addressess: [{ address, pincode, landmark, isPrimary: true }],
    });

    await Addressdetails.save();
    res
      .status(200)
      .json({ message: "Address Addesd Succefully", Addressdetails });
  } catch (e) {
    res.status(500).json({ message: " Error In adding Address", e: e.message });
  }
};

export const getaddress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const address = await Address.findOne({ userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json({ message: "Address fetched Succefully", address });
  } catch (e) {
    res
      .status(500)
      .json({ message: " Error In fetching Address", e: e.message });
  }
};

export const updateaddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;
    const { address, pincode, landmark, isPrimary } = req.body;

    const existingaddress = await Address.findOne({ userId });

    if (!existingaddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    const addressindex = existingaddress.addressess.findIndex(
      (item) => item._id.toString() === addressId,
    );
    if (addressindex === -1) {
      return res.status(404).json({ message: "Address not found in list" });
    }

    const selectedaddress = existingaddress.addressess[addressindex];

    selectedaddress.address = address ?? selectedaddress.address;
    selectedaddress.pincode = pincode ?? selectedaddress.pincode;
    selectedaddress.landmark = landmark ?? selectedaddress.landmark;

    if (isPrimary === true) {
      existingaddress.addressess.forEach((addr) => {
        addr.isPrimary = false;
      });

      selectedaddress.isPrimary = true;
    }
    await existingaddress.save();

    res.status(200).json({
      message: "Address updated successfully",
      data: existingaddress,
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: " Error In fetching Address", e: e.message });
  }
};

export const deleteaddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.body;

    const existingaddress = await Address.findOne({ userId });
    if (!existingaddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    const addressindex = existingaddress.addressess.findIndex(
      (item) => item._id.toString() === addressId,
    );

    if (addressindex === -1) {
      return res.status(404).json({ message: "Address not found in list" });
    }

    const isDeletingPrimary =
      existingaddress.addressess[addressindex].isPrimary;

    existingaddress.addressess.splice(addressindex, 1);

    if (isDeletingPrimary && existingaddress.addressess.length > 0) {
      existingaddress.addressess[0].isPrimary = true;
    }

    await existingaddress.save();
    res
      .status(200)
      .json({ message: "Address removed successfully", existingaddress });
  } catch (e) {
    res
      .status(500)
      .json({ message: " Error In fetching Address", e: e.message });
  }
};
