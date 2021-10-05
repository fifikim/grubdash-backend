const path = require("path");
const dishes = require(path.resolve("src/data/dishes-data"));
const nextId = require("../utils/nextId");  // util function to assign ID's

// middleware
function isValidDish(req, res, next) {
  const dish = req.body.data;
  const REQUIRED_PROPERTIES = ['name', 'description', 'price', 'image_url'];
  for (let property of REQUIRED_PROPERTIES) {
    if (!dish[property]) {
      return next({
        status: 400,
        message: `Dish must include a ${property}`,
      });
    }
  }
  res.locals.dish = dish;
  next();
}

function hasValidPrice(req, res, next) {
  const price = res.locals.dish.price;
  if (typeof(price) !== 'number' || price <= 0 || price !== parseInt(price)) {
    return next({
      status: 400,
      message: 'Dish must have a price that is an integer greater than 0',
    });
  } 
  next();
}

function dishExists(req, res, next) {
  const dishId = req.params.dishId;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish id not found: ${req.params.dishId}`,
  });
}

function routeMatchesId(req, res, next) {
  const dishId = req.params.dishId;
  const updatedDish = res.locals.dish;
  if (!updatedDish.id || updatedDish.id === undefined || updatedDish.id === null) {
    return next();
  }
  if (dishId !== updatedDish.id) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${updatedDish.id}, Route: ${dishId}`,
    });
  }
  next();
}

// /dishes route handlers
function list(req, res) {
  res.json({ data: dishes })
};

function create(req, res) {
  const newDish = res.locals.dish;
  newDish.id = nextId();
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
};

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function update(req, res) {
  const dishId = req.params.dishId;
  const updatedDish = res.locals.dish;
  if (!updatedDish.id) {
    updatedDish.id = dishId;
  }
  res.json({ data: updatedDish });
}

module.exports = {
  list, 
  create: [isValidDish, hasValidPrice, create],
  read: [dishExists, read],
  update: [dishExists, isValidDish, hasValidPrice, routeMatchesId, update],
}