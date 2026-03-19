var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

function getPayload(req, res) {
    let product = req.body.product;
    let quantity = Number(req.body.quantity);

    if (!mongoose.Types.ObjectId.isValid(product)) {
        res.status(400).send({
            message: 'product must be a valid MongoDB ObjectId'
        });
        return null;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        res.status(400).send({
            message: 'quantity must be a number greater than 0'
        });
        return null;
    }

    return {
        product,
        quantity
    };
}

async function ensureInventory(productId) {
    return await inventoryModel.findOneAndUpdate({
        product: productId
    }, {
        $setOnInsert: {
            product: productId
        }
    }, {
        upsert: true,
        returnDocument: 'after'
    });
}

async function findActiveProduct(productId) {
    return await productModel.findOne({
        _id: productId,
        isDeleted: false
    });
}

router.get('/', async function (req, res) {
    try {
        let result = await inventoryModel.find({}).populate({
            path: 'product'
        });
        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.get('/:id', async function (req, res) {
    try {
        let result = await inventoryModel.findById(req.params.id).populate({
            path: 'product'
        });
        if (!result) {
            return res.status(404).send({
                message: 'ID NOT FOUND'
            });
        }
        res.send(result);
    } catch (error) {
        res.status(404).send({
            message: error.message
        });
    }
});

router.post('/add-stock', async function (req, res) {
    try {
        let payload = getPayload(req, res);
        if (!payload) {
            return;
        }

        let existedProduct = await findActiveProduct(payload.product);
        if (!existedProduct) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        await ensureInventory(payload.product);
        let result = await inventoryModel.findOneAndUpdate({
            product: payload.product
        }, {
            $inc: {
                stock: payload.quantity
            }
        }, {
            returnDocument: 'after'
        }).populate({
            path: 'product'
        });

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.post('/remove-stock', async function (req, res) {
    try {
        let payload = getPayload(req, res);
        if (!payload) {
            return;
        }

        let existedProduct = await findActiveProduct(payload.product);
        if (!existedProduct) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        await ensureInventory(payload.product);
        let result = await inventoryModel.findOneAndUpdate({
            product: payload.product,
            stock: {
                $gte: payload.quantity
            }
        }, {
            $inc: {
                stock: -payload.quantity
            }
        }, {
            returnDocument: 'after'
        }).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'NOT ENOUGH STOCK'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.post('/reservation', async function (req, res) {
    try {
        let payload = getPayload(req, res);
        if (!payload) {
            return;
        }

        let existedProduct = await findActiveProduct(payload.product);
        if (!existedProduct) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        await ensureInventory(payload.product);
        let result = await inventoryModel.findOneAndUpdate({
            product: payload.product,
            stock: {
                $gte: payload.quantity
            }
        }, {
            $inc: {
                stock: -payload.quantity,
                reserved: payload.quantity
            }
        }, {
            returnDocument: 'after'
        }).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'NOT ENOUGH STOCK'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.post('/sold', async function (req, res) {
    try {
        let payload = getPayload(req, res);
        if (!payload) {
            return;
        }

        let existedProduct = await findActiveProduct(payload.product);
        if (!existedProduct) {
            return res.status(404).send({
                message: 'PRODUCT NOT FOUND'
            });
        }

        await ensureInventory(payload.product);
        let result = await inventoryModel.findOneAndUpdate({
            product: payload.product,
            reserved: {
                $gte: payload.quantity
            }
        }, {
            $inc: {
                reserved: -payload.quantity,
                soldCount: payload.quantity
            }
        }, {
            returnDocument: 'after'
        }).populate({
            path: 'product'
        });

        if (!result) {
            return res.status(400).send({
                message: 'NOT ENOUGH RESERVED'
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

module.exports = router;
