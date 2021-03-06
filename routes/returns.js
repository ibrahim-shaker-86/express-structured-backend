const express = require("express");
const Joi = require("joi");
const router = express.Router();

const { Rental } = require("../models/rental");
const { Movie } = require("../models/movie");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");

const validateReturn = (validatedItemBody) => {
  const schema = Joi.object({
    customerId: Joi.objectId().required(),
    movieId: Joi.objectId().required(),
  });
  return schema.validate(validatedItemBody);
};

router.post("/", [auth, validate(validateReturn)], async (req, res) => {
  const rental = await Rental.lookup(req.body.customerId, req.body.movieId);
  if (!rental) return res.status(404).send("rental not found!");
  if (rental.dateReturned)
    return res.status(400).send("return already processed!");
  rental.return();
  await rental.save();
  await Movie.update(
    { _id: rental.movie._id },
    {
      $inc: { numberInStock: 1 },
    }
  );
  return res.send(rental);
});
module.exports = router;
