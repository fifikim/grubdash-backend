const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");  // util function to assign ID's

// middleware
function isValidOrder(req, res, next) {
  const order = req.body.data;
  const REQUIRED_PROPERTIES = ['deliverTo', 'mobileNumber', 'dishes'];
  for (let property of REQUIRED_PROPERTIES) {
    if (!order[property]) {
      const message = property === 'dishes' ? `Order must include a dish` : `Order must include a ${property}`;
      return next({
        status: 400,
        message,
      });
    }
  }
  res.locals.order = order;
  next();
}

function orderHasValidQty(req, res, next) {
  const orderDishes = res.locals.order.dishes;
  if (orderDishes.length < 1 || !Array.isArray(orderDishes)) {
    return next({
      status: 400,
      message: 'Order must include at least one dish',
    })
  }
  next();
} 

function dishesHaveValidQty(req, res, next) {
  const orderDishes = res.locals.order.dishes;
  let invalidDish;
  for (let i = 0; i < orderDishes.length; i++) {
    let currentDish = orderDishes[i];
    if (!currentDish.quantity || currentDish.quantity <= 0 || currentDish.quantity !== parseInt(currentDish.quantity)) {
      invalidDish = true;
      res.locals.index = i;
    }
  }
  if (invalidDish) {
    return next({
      status: 400,
      message: `Dish ${res.locals.index} must have a quantity that is an integer greater than 0`,
    });
  }
  next();
}

function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`,
  });
}

function hasValidStatus(req, res, next) {
  const order = res.locals.order;
  if (order.status === 'pending' || order.status === 'preparing' || order.status === 'out-for-delivery') {
    return next();
  } else if (order.status == 'delivered') {
    return next({
      status: 400,
      message: 'A delivered order cannot be changed',
    })
  }
  next({
    status: 400,
    message: 'Order must have a status of pending, preparing, out-for-delivery, delivered',
  });
}

function routeMatchesId(req, res, next) {
  const orderId = req.params.orderId;
  const order = res.locals.order;
  if (!order.id) {
    return next();
  }
  if (orderId !== order.id) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${order.id}, Route: ${orderId}`,
    });
  }
  next();
}

function isPending(req, res, next) {
  if(res.locals.order.status === 'pending') {
    return next();
  }
  next({
    status: 400,
    message: 'An order cannot be deleted unless it is pending',
  })
}

// /orders route handlers 
function list(req, res) {
  res.json({ data: orders })
};

function create(req, res) {
  const newOrder = res.locals.order;
  newOrder.id = nextId();
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
};

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const orderId = req.params.orderId;
  const order = res.locals.order;
  if (!order.id) {
    order.id = orderId;
  }
  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

module.exports = {
  list, 
  create: [isValidOrder, orderHasValidQty, dishesHaveValidQty, create],
  read: [orderExists, read],
  update: [orderExists, isValidOrder, orderHasValidQty, dishesHaveValidQty, hasValidStatus, routeMatchesId, update],
  delete: [orderExists, isPending, destroy],
}