const mongoose = require("mongoose");
const request = require("supertest");
const moment = require("moment");
const { User } = require("../../../models/user");
const { Rental } = require("../../../models/rental");
const { Movie } = require("../../../models/movie");

describe("/returns", () => {
  let server, rental, movie, customerId, movieId, token;

  const exec = () => {
    return request(server)
      .post("/returns")
      .set("x-auth-token", token)
      .send({ customerId, movieId });
  };

  beforeEach(async () => {
    server = require("../../../index");
    customerId = mongoose.Types.ObjectId();
    movieId = mongoose.Types.ObjectId();
    token = new User().generateAuthToken();

    movie = new Movie({
      _id: movieId,
      title: "12345",
      dailyRentalRate: 2,
      genre: { name: "12345" },
      numberInStock: 10,
    });
    await movie.save();

    rental = new Rental({
      customer: {
        _id: customerId,
        name: "12345",
        phone: "12345",
      },
      movie: {
        _id: movieId,
        title: "12345",
        dailyRentalRate: 2,
      },
    });
    await rental.save();
  });
  afterEach(() => {
    server.close();
    Rental.deleteMany({});
    Movie.deleteMany({});
  });

  it("should return 401 if client is not logged in", async () => {
    token = "";
    const res = await exec();
    expect(res.status).toBe(401);
  });
  it("should return 400 if customerId is not provided", async () => {
    customerId = "";
    const res = await exec();
    expect(res.status).toBe(400);
  });
  it("should return 400 if movieId is not provided", async () => {
    movieId = "";
    const res = await exec();
    expect(res.status).toBe(400);
  });

  it("should return 404 if no rental found for customer/movie", async () => {
    await Rental.deleteMany({});
    const res = await exec();
    expect(res.status).toBe(404);
  });

  it("should return 400 if return is already processed", async () => {
    rental.dateReturned = new Date();
    await rental.save();
    const res = await exec();
    expect(res.status).toBe(400);
  });

  it("should return 200 if we hav a valid request", async () => {
    const res = await exec();
    expect(res.status).toBe(200);
  });

  it("should set the returnDate if input is valid", async () => {
    await exec();
    const rentalInDB = await Rental.findById(rental._id);
    const diff = new Date() - rentalInDB.dateReturned;
    expect(diff).toBeLessThan(10000);
  });

  it("should set the rental fee if input is valid", async () => {
    rental.dateOut = moment().add(-7, "days").toDate();
    await rental.save();
    await exec();
    const rentalInDB = await Rental.findById(rental._id);
    expect(rentalInDB.rentalFee).toBe(14);
  });

  it("should increase the movie stock if input is valid", async () => {
    await exec();
    const movieInDB = await Movie.findById(movieId);
    expect(movieInDB.numberInStock).toBe(movie.numberInStock + 1);
  });

  it("should return the rental if input is valid", async () => {
    const res = await exec();

    expect(Object.keys(res.body)).toEqual(
      expect.arrayContaining([
        "customer",
        "movie",
        "dateOut",
        "dateReturned",
        "rentalFee",
      ])
    );
  });
});
