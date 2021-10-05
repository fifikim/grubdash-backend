const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// middleware
function isValidDish(req, res, next) {
  const dish = req.body.data;
  if (!dish.name || dish.name === '') {
    return next({
      status: 400,
      message: 'Dish must include a name',
    })
  } else if (!dish.description || dish.description === '') {
    return next({
      status: 400,
      message: 'Dish must include a description',
    })
  } else if (!dish.price) {
    return next({
      status: 400,
      message: 'Dish must include a price',
    })
  } else if (typeof(dish.price) !== 'number' || dish.price <= 0 || dish.price !== parseInt(dish.price)) {
    return next({
      status: 400,
      message: 'Dish must have a price that is an integer greater than 0',
    })
  } else if (!dish.image_url || dish.image_url === '') {
    return next({
      status: 400,
      message: 'Dish must include a image_url'
    })
  }
  res.locals.dish = dish;
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
  const dish = res.locals.dish;
  if (!dish.id || dish.id === undefined || dish.id === null) {
    return next();
  }
  if (dishId !== dish.id) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${dish.id}, Route: ${dishId}`,
    });
  }
  next();
}

// TODO: Implement the /dishes handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: dishes })
};

function create(req, res) {
  const { name, description, price, image_url } = res.locals.dish;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  }
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
};

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function update(req, res) {
  const dishId = req.params.dishId;
  const dish = res.locals.dish;
  if (!dish.id) {
    dish.id = dishId;
  }
  res.json({ data: dish });
}

module.exports = {
  list, 
  create: [isValidDish, create],
  read: [dishExists, read],
  update: [dishExists, isValidDish, routeMatchesId, update],
}