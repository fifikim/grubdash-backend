const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// middleware
function isValidOrder(req, res, next) {
  const order = req.body.data;
  if (!order.deliverTo || order.deliverTo === '') {
    return next({
      status: 400,
      message: 'Order must include a deliverTo',
    })
  } else if (!order.mobileNumber || order.mobileNumber === '') {
    return next({
      status: 400,
      message: 'Order must include a mobileNumber',
    })
  } else if (!order.dishes) {
    return next({
      status: 400,
      message: 'Order must include a dish',
    })
  } else if (order.dishes.length < 1 || !Array.isArray(order.dishes)) {
    return next({
      status: 400,
      message: 'Order must include at least one dish',
    })
  } 
  res.locals.order = order;
  next();
}

function hasValidQty(req, res, next) {
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
  if (!order.id || order.id === undefined || order.id === null) {
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

// TODO: Implement the /dishes handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: orders })
};

function create(req, res) {
  const { deliverTo, mobileNumber, status = '', dishes } = res.locals.order;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  }
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
  create: [isValidOrder, hasValidQty, create],
  read: [orderExists, read],
  update: [orderExists, isValidOrder, hasValidQty, hasValidStatus, routeMatchesId, update],
  delete: [orderExists, isPending, destroy],
}