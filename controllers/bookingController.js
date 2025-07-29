
const Booking = require('../models/Booking');

exports.createBooking = async (req, res) => {
  try {
    const {
      projectName,
      projectType,
      clientName,
      mobile,
      salesExecutiveName,
      unit,
      paymentType1,
      paymentType2,
      totalDealCost,
      tower,
      aadharNumber,
      aadharCopy,
      panNumber,
      panCopy,
      coAllotteeAadharCopy,

coAllotteeAadharNumber,

coAllotteePanCopy,
coAllotteePanNumber,


coAllotteeDob,

coAllotteeMobile,

coAllotteeEmail,

coAllotteeProfession,
coAllotteeAge,
coAllotteeAddress,


      _id, // Destructure _id but ignore it
      ...rest
    } = req.body;

    const createdBy = req.user._id;

    // Validate required fields
    if (!projectName || projectName.trim() === '') {
      return res.status(400).json({ message: 'Project Name is required.' });
    }
    if (!projectType || projectType.trim() === '') {
      return res.status(400).json({ message: 'Project Type is required.' });
    }
    if (!clientName || clientName.trim() === '') {
      return res.status(400).json({ message: 'Client Name is required.' });
    }
    if (!mobile || mobile.trim() === '') {
      return res.status(400).json({ message: 'Mobile is required.' });
    }
    if (!salesExecutiveName || salesExecutiveName.trim() === '') {
      return res.status(400).json({ message: 'Sales Executive Name is required.' });
    }
    if (!unit || unit.trim() === '') {
      return res.status(400).json({ message: 'Unit is required.' });
    }
    if (paymentType1 === undefined || isNaN(paymentType1)) {
      return res.status(400).json({ message: 'Payment Type 1 is required and must be a number.' });
    }
    if (paymentType2 === undefined || isNaN(paymentType2)) {
      return res.status(400).json({ message: 'Payment Type 2 is required and must be a number.' });
    }
    if (totalDealCost === undefined || isNaN(totalDealCost)) {
      return res.status(400).json({ message: 'Total Deal Cost is required and must be a number.' });
    }

    // Generate clean, consistent taskId
    const taskId = `${projectName.trim()}/${projectType.trim()}/${unit.trim()}/${clientName.trim()}`;

    // Sanitize co-allottee data
    const sanitizedCoAllottees = {
      dob: coAllotteeDob?.trim() || '',
      age: coAllotteeAge
?.trim() || '',
      profession: coAllotteeProfession
?.trim() || '',
      panNumber:coAllotteePanNumber
?.trim() || '',
      aadharNumber: coAllotteeAadharNumber.trim() || '',
      panCopy: coAllotteePanCopy?.trim() || '',
      aadharCopy:coAllotteeAadharCopy.trim() || '',
      email: coAllotteeEmail?.trim() || '',
      mobile: coAllotteeMobile?.trim() || '',
      address: coAllotteeAddress?.trim() || '',
    };

    const booking = new Booking({
      projectName: projectName.trim(),
      projectType: projectType.trim(),
      clientName: clientName.trim(),
      mobile: mobile.trim(),
      salesExecutiveName: salesExecutiveName.trim(),
      unit: unit.trim(),
      paymentType1: Number(paymentType1),
      paymentType2: Number(paymentType2),
      totalDealCost: Number(totalDealCost),
      tower: tower?.trim() || 'N/A',
      aadharNumber: aadharNumber?.trim() || '',
      aadharCopy: aadharCopy?.trim() || '',
      panNumber: panNumber?.trim() || '',
      panCopy: panCopy?.trim() || '',
      coAllottees: sanitizedCoAllottees,
      taskId,
      createdBy,
      ...rest,
    });

    await booking.save();
    res.status(201).json(booking);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.taskId) {
      return res.status(400).json({ message: 'Duplicate taskId detected. Please check projectName, projectType, unit, and clientName for uniqueness.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ timestamp: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    const allowedStatuses = ['pending', 'active', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
    }

    const updateFields = { status };
    if (status.toLowerCase() === 'rejected' && remark) {
      updateFields.remark = remark.trim();
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, updateFields, { new: true });

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json({
      message: 'Booking deleted successfully.',
      deletedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectName,
      projectType,
      clientName,
      mobile,
      salesExecutiveName,
      unit,
      paymentType1,
      paymentType2,
      totalDealCost,
      tower,
      aadharNumber,
      aadharCopy,
      panNumber,
      panCopy,
        coAllotteeAadharCopy,

coAllotteeAadharNumber,

coAllotteePanCopy,
coAllotteePanNumber,


coAllotteeDob,

coAllotteeMobile,

coAllotteeEmail,

coAllotteeProfession,
coAllotteeAge,
coAllotteeAddress,

      status,
      ...rest
    } = req.body;

    // Validate required fields
    if (!projectName || projectName.trim() === '') {
      return res.status(400).json({ message: 'Project Name is required.' });
    }
    if (!projectType || projectType.trim() === '') {
      return res.status(400).json({ message: 'Project Type is required.' });
    }
    if (!clientName || clientName.trim() === '') {
      return res.status(400).json({ message: 'Client Name is required.' });
    }
    if (!mobile || mobile.trim() === '') {
      return res.status(400).json({ message: 'Mobile is required.' });
    }
    if (!salesExecutiveName || salesExecutiveName.trim() === '') {
      return res.status(400).json({ message: 'Sales Executive Name is required.' });
    }
    if (!unit || unit.trim() === '') {
      return res.status(400).json({ message: 'Unit is required.' });
    }
    if (paymentType1 === undefined || isNaN(paymentType1)) {
      return res.status(400).json({ message: 'Payment Type 1 is required and must be a number.' });
    }
    if (paymentType2 === undefined || isNaN(paymentType2)) {
      return res.status(400).json({ message: 'Payment Type 2 is required and must be a number.' });
    }
    if (totalDealCost === undefined || isNaN(totalDealCost)) {
      return res.status(400).json({ message: 'Total Deal Cost is required and must be a number.' });
    }

    // Validate status if provided
    const allowedStatuses = ['pending', 'active', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
    }

    // Generate taskId
    const taskId = `${projectName.trim()}/${projectType.trim()}/${unit.trim()}/${clientName.trim()}`;

    // Sanitize co-allottee data
    // Sanitize co-allottee data
    const sanitizedCoAllottees = {
      dob: coAllotteeDob?.trim() || '',
      age: coAllotteeAge
?.trim() || '',
      profession: coAllotteeProfession
?.trim() || '',
      panNumber:coAllotteePanNumber
?.trim() || '',
      aadharNumber: coAllotteeAadharNumber.trim() || '',
      panCopy: coAllotteePanCopy?.trim() || '',
      aadharCopy:coAllotteeAadharCopy.trim() || '',
      email: coAllotteeEmail?.trim() || '',
      mobile: coAllotteeMobile?.trim() || '',
      address: coAllotteeAddress?.trim() || '',
    };

    const updateData = {
      projectName: projectName.trim(),
      projectType: projectType.trim(),
      clientName: clientName.trim(),
      mobile: mobile.trim(),
      salesExecutiveName: salesExecutiveName.trim(),
      unit: unit.trim(),
      paymentType1: Number(paymentType1),
      paymentType2: Number(paymentType2),
      totalDealCost: Number(totalDealCost),
      tower: tower?.trim() || 'N/A',
      aadharNumber: aadharNumber?.trim() || '',
      aadharCopy: aadharCopy?.trim() || '',
      panNumber: panNumber?.trim() || '',
      panCopy: panCopy?.trim() || '',
      coAllottees: sanitizedCoAllottees,
      taskId,
      ...rest,
    };

    if (status) {
      updateData.status = status;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json(updatedBooking);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.taskId) {
      return res.status(400).json({ message: 'Duplicate taskId detected. Please check projectName, projectType, unit, and clientName for uniqueness.' });
    }
    res.status(500).json({ message: error.message });
  }
};








// const Booking = require("../models/Booking");

// exports.createBooking = async (req, res) => {
//   try {
//     const { projectName, projectType, clientName, unit, ...rest } = req.body;

//     const createdBy = req.user._id;


//     // Generate clean, consistent taskId
//     const taskId = `${projectName.trim()}/${projectType.trim()}/${unit.trim()}/${clientName.trim()}`;

//     const booking = new Booking({
//       projectName,
//       projectType,
//       clientName,
//       unit,
//       taskId, // 👈 auto-set
//       createdBy,
//         ...rest,
//     });
    
//     await booking.save();
//     res.status(201).json(booking);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Get all bookings
// exports.getAllBookings = async (req, res) => {
//   try {
//     const bookings = await Booking.find().sort({ timestamp: -1 });
//     res.status(200).json(bookings);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update booking status (Cancel / Active)
// // exports.updateBookingStatus = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { status, remark } = req.body;
// //     const updatedBooking = await Booking.findByIdAndUpdate(
// //       id,
// //       { status },
// //       { new: true }
// //     );
// //     res.status(200).json(updatedBooking);
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // };


// // Update booking status (Cancel / Active / Rejected with remark)
// exports.updateBookingStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, remark } = req.body;

//     const updateFields = { status };

//     // Save remark only if status is 'rejected' in any case
//     if (status?.toLowerCase() === 'rejected' && remark) {
//       updateFields.remark = remark;
//     }

//     const updatedBooking = await Booking.findByIdAndUpdate(
//       id,
//       updateFields,
//       { new: true }
//     );

//     res.status(200).json(updatedBooking);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.deleteBooking = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedBooking = await Booking.findByIdAndDelete(id);

//     if (!deletedBooking) {
//       return res.status(404).json({ message: "Booking not found." });
//     }

//     res.status(200).json({
//       message: "Booking deleted successfully.",
//       deletedBooking,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };





// exports.updateBooking = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       projectName,
//       projectType,
//       clientName,
//       mobile,
//       salesExecutiveName,
//       unit,
//       paymentType1,
//       paymentType2,
//       totalDealCost,
//       tower,
//       status,
//       ...rest
//     } = req.body;

//     // Validate required fields with type checks
//     if (!projectName || projectName.trim() === "") {
//       return res.status(400).json({ message: "Project Name is required." });
//     }
//     if (!projectType || projectType.trim() === "") {
//       return res.status(400).json({ message: "Project Type is required." });
//     }
//     if (!clientName || clientName.trim() === "") {
//       return res.status(400).json({ message: "Client Name is required." });
//     }
//     if (!mobile || mobile.trim() === "") {
//       return res.status(400).json({ message: "Mobile is required." });
//     }
//     if (!salesExecutiveName || salesExecutiveName.trim() === "") {
//       return res.status(400).json({ message: "Sales Executive Name is required." });
//     }
//     if (!unit || unit.trim() === "") {
//       return res.status(400).json({ message: "Unit is required." });
//     }
//     if (paymentType1 === undefined || isNaN(paymentType1)) {
//       return res.status(400).json({ message: "Payment Type 1 is required and must be a number." });
//     }
//     if (paymentType2 === undefined || isNaN(paymentType2)) {
//       return res.status(400).json({ message: "Payment Type 2 is required and must be a number." });
//     }
//     if (totalDealCost === undefined || isNaN(totalDealCost)) {
//       return res.status(400).json({ message: "Total Deal Cost is required and must be a number." });
//     }
//     if (!tower || tower.toString().trim() === "") {
//   return res.status(400).json({ message: "Tower is required and must be a non-empty string." });
// }


//     // Validate status if provided
//     const allowedStatuses = ["pending", "active", "rejected"];
//     if (status && !allowedStatuses.includes(status)) {
//       return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(", ")}` });
//     }

//     const taskId = `${projectName.trim()}/${projectType.trim()}/${unit.trim()}/${clientName.trim()}`;

//     const updateData = {
//       projectName: projectName.trim(),
//       projectType: projectType.trim(),
//       clientName: clientName.trim(),
//       mobile: mobile.trim(),
//       salesExecutiveName: salesExecutiveName.trim(),
//       unit: unit.trim(),
//       paymentType1: Number(paymentType1),
//       paymentType2: Number(paymentType2),
//       totalDealCost: Number(totalDealCost),
//       tower: tower.toString().trim(),

//       taskId,
//       ...rest,
//     };

//     if (status) {
//       updateData.status = status;
//     }

//     const updatedBooking = await Booking.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!updatedBooking) {
//       return res.status(404).json({ message: "Booking not found." });
//     }

//     res.status(200).json(updatedBooking);
//   } catch (error) {
//     // Handle duplicate taskId error cleanly
//     if (error.code === 11000 && error.keyPattern && error.keyPattern.taskId) {
//       return res.status(400).json({ message: "Duplicate taskId detected. Please check projectName, projectType, unit, and clientName for uniqueness." });
//     }

//     res.status(500).json({ message: error.message });
//   }
// };


