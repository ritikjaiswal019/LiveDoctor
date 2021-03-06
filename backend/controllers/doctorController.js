const asyncHandler = require("express-async-handler");
const Doctor = require("../models/doctorModel");
const Appointment = require("../models/appointmentModel");
const sendMail = require("../utils/sendMail");
const { update } = require("../models/doctorModel");

// get all doctors
exports.getAllDoctors = asyncHandler(async (req, res, next) => {
  // Get all doctors list
  const doctors = await Doctor.find({});
  res.status(200).json(doctors);
});

// getting details of  a particular doctor
exports.getDoctorDetails = asyncHandler(async (req, res, next) => {
  const doctorInfo = await Doctor.findById(req.params.id, {
    firstName: 1,
    lastName: 1,
    speciality: 1,
    rating: 1,
    fees: 1,
    image: 1,
    treatments: 1,
    education: 1,
    email: 1,
    patientsConsulted: 1,
    experience: 1,
  });

  if (!doctorInfo && !doctorInfo._id) {
    throw new Error("No doctor found with this Id");
  }

  res.status(200).json(doctorInfo);
});

// getting all requested appointments
exports.getAllAppointments = asyncHandler(async (req, res, next) => {
  // getting all the  appointments

  // Checking whether the doctor requesting for appointments is real doctor or some other doctor
  // One doctor cannot get other doctor's appointments
  // req.user._id will be of type object id so we need to convert it into string
  if (req.params.id !== req.user._id.toString()) {
    throw new Error("You can't access other doctor's appointments");
  }

  const appointments = await Appointment.find({
    doctor: req.params.id,
  }).populate("patient");

  console.log(appointments);
  res.status(200).json(appointments);
});

//doctor updating Appointment
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
  // finding the appointment
  const appointment = await Appointment.findById(req.params.id);

  // checking whether the doctor id in the token and doctor id in appointment document matches or not
  // because no doctor change the appointment of other doctors
  if (!appointment) {
    throw new Error("No appointment found with this Id");
  }

  if (appointment.doctor.toString() !== req.user._id.toString()) {
    throw new Error("You cannot change other doctor's apppointment status");
  }

  // Updating the appoitnment
  const updatedAppointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id },
    { $set: req.body },
    { returnDocument: "after" }
  ).populate("patient doctor");

  console.log("THis is the updated appoitnemnt", updatedAppointment);

  //Mail details like sender,reciever,subject,text
  let mailDetails = {
    from: "livedoctor7@gmail.com",
    to: updatedAppointment.patient.email,
    subject: "Mail Regarding your Appointment Request",
  };

  //Date formatting options
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };

  if (req.body.status === "Booked") {
    mailDetails.text = `Your appointment with doctor ${
      updatedAppointment.doctor.firstName
    } ${updatedAppointment.doctor.lastName} on ${new Date(
      updatedAppointment.appointmentDate
    ).toLocaleDateString("en-US", dateOptions)} for slot ${
      updatedAppointment.startTime
    }PM - ${
      updatedAppointment.endTime
    }PM has been booked.For the doctor to consult you on the alloted date and slot first you need to pay the fees.Visit this link to pay the fees http://localhost:3000/user/${
      updatedAppointment.patient._id
    }/dashboard/booked-appointments`;
    await sendMail(mailDetails);
  } else if (req.body.status === "Rejected") {
    mailDetails.text = `Your appointment with doctor ${
      updatedAppointment.doctor.firstName
    } ${updatedAppointment.doctor.lastName} on ${new Date(
      updatedAppointment.appointmentDate
    ).toLocaleDateString("en-US", dateOptions)} for slot ${
      updatedAppointment.startTime
    }PM - ${
      updatedAppointment.endTime
    }PM has been rejected because the doctor is not available for the alloted time and slot so please try to book appointment on some other date or slot`;
    await sendMail(mailDetails);
  }

  res.status(200).json(updatedAppointment);
});
