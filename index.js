'use strict';

module.exports = (Model, options) => {
    let fields = options.fields || ['name'];
    if (_.isString(fields)) {
        fields = [fields];
    }
    Model.defineProperty('slug', { type: String });
    Model.validatesUniquenessOf('slug', { message: 'is not unique' });
    Model.observe('access', function (ctx, next) {
        if (ctx.query.where && ctx.query.where.id) {
            ctx.query.where.or = [{
                id: ctx.query.where.id
            }, {
                slug: ctx.query.where.id
            }];
            ctx.query.where = _.omit(ctx.query.where, ['id']);
        }
        next();
    });


    Model.getBaseSlug = (instance) => {
        const slug = _.snakeCase(_.trim(_.join(_.filter(_.map(fields, field => instance[field])), '_')));
        return slug === '_' ? '0' : slug;
    }

    Model.findUniqueSlug = async (instance) => {
        let baseSlug = Model.getBaseSlug(instance);
        let regex = baseSlug === '0' ? new RegExp(`^${baseSlug}_([0-9]+){0,1}$`) : new RegExp(`^([0-9]+)$`);
        let similarInstances = await Model.find({
            where: {
                slug: {
                    like: regex
                }
            }
        });
        if (!similarInstances.length) {
            return baseSlug;
        }
        let maxCount = 0;
        _.forEach(similarInstances, similarInstance => {
            let match = similarInstance.slug.match(regex), count;
            if (match[1]) {
                count = parseInt(match[1]);
            }
            if (count > maxCount) {
                maxCount = count;
            }
        });
        return baseSlug + '_' + (maxCount + 1);
    }

    Model.observe('before save', async (ctx, next) => {
        var instance = ctx.instance || ctx.data;
        let where = {};
        if (instance.id) {
            where.id = instance.id;
        }
        else {
            where = ctx.where;
        }
        let createNewSlug = false;
        if (!ctx.isNewInstance) {
            let prevInstance = await Model.findOne({ where });
            createNewSlug = !prevInstance.slug;
        }
        else {
            createNewSlug = !instance.slug;
        }
        if (createNewSlug) {
            instance.slug = await Model.findUniqueSlug(instance);
        }
    });

    Model.updateSlug = async () => {
        let instances = await Model.find({ where: { slug: { exists: false } } });
        for (let i = 0; i < instances.length; i++) {
            let instance = instances[i];
            let slug = await Model.findUniqueSlug(instance);
            await instance.updateAttributes({ slug });
        }
    }

    setTimeout(Model.updateSlug, 5000);
}

