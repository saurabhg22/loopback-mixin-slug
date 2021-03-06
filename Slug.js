"use strict";
const _ = require("lodash");

module.exports = (Model, options) => {
	let fields = options.fields || ["name"];
	if (_.isString(fields)) {
		fields = [fields];
	}
	Model.defineProperty("slug", { type: String, index: { unique: true } });
	Model.observe("access", function (ctx, next) {
		if (ctx.query.where && ctx.query.where.id) {
			let id = ctx.query.where.id;
			if (id.toString() && id.toString() !== "[object Object]") {
				id = id.toString();
			}
			ctx.query.where.or = [
				{
					id,
				},
				{
					slug: id,
				},
			];
			ctx.query.where = _.omit(ctx.query.where, ["id"]);
		}
		next();
	});

	Model.validateSlug = (slug) => {
		if (!slug) return false;
		return (
			/^[a-z0-9]+([a-z0-9_-])*$/.test(slug) &&
			/^([a-z0-9_-])*[a-z0-9]+$/.test(slug)
		);
	};

	Model.isSlugValid = async (slug, id) => {
		if(!Model.validateSlug(slug)){
			return Promise.reject({
				statusCode:400,
				error:{
					code: "INVALID_SLUG"
				}
			})
		}

		const instance = await Model.findOne({where:{slug}});
		if(id && instance && instance.id.toString() === id.toString()) return true;

		return !instance;
	}

	Model.getBaseSlug = (instance) => {
		let input = _.join(
			_.filter(_.map(fields, (field) => instance[field])),
			"_"
		).toLowerCase();
		input = _.trim(
			input
				.split("")
				.filter((ch) => /[a-z0-9 _-]/.test(ch))
				.join(""),
			"- _"
		);
		let slug = _.snakeCase(_.trim(input));
		slug = !slug || slug === "_" ? "0" : slug;
		slug = slug.replace(/_/g, "-");
		return slug;
	};

	Model.findUniqueSlug = async (instance, ctx) => {
		let _Model = Model;
		if (ctx && ctx.Model) {
			_Model = ctx.Model;
		}
		let baseSlug = _Model.getBaseSlug(instance);
		let regex =
			baseSlug === "0"
				? new RegExp(`^([0-9]+)$`)
				: new RegExp(`^${baseSlug}(-[0-9]+){0,2}$`);
		let similarInstances = await _Model.find({
			where: {
				slug: {
					like: regex,
				},
			},
		});
		if (!similarInstances.length) {
			return baseSlug;
		}
		let maxCount = 0;
		_.forEach(similarInstances, (similarInstance) => {
			let match = similarInstance.slug.match(regex),
				count = 0;
			if (match[1]) {
				count = parseInt(match[1].replace("-", ""));
			}
			if (count > maxCount) {
				maxCount = count;
			}
		});
		return baseSlug + "-" + (maxCount + 1);
	};

	Model.observe("before save", async (ctx) => {
		var instance = ctx.instance || ctx.data;
		let where = {};
		if (instance.id) {
			where.id = instance.id;
		} else {
			where = ctx.where;
		}
		if (instance.slug && !Model.validateSlug(instance.slug)) {
			return Promise.reject({
				statusCode: 400,
				message: "Invalid slug.",
			});
		}
		let createNewSlug = false;
		if (!ctx.isNewInstance) {
			let prevInstance = await ctx.Model.findOne({ where });
			createNewSlug = !prevInstance.slug && !instance.slug;
		} else {
			createNewSlug = !instance.slug;
		}
		if (createNewSlug) {
			instance.slug = await ctx.Model.findUniqueSlug(instance, ctx);
		}
	});

	Model.updateSlug = async () => {
		let instances = await Model.find({
			where: {
				or: [{ slug: { exists: false } }, { slug: "" }, { slug: null }],
			},
		});
		for (let i = 0; i < instances.length; i++) {
			let instance = instances[i];
			let slug = await Model.findUniqueSlug(instance);
			await instance.updateAttributes({ slug });
		}
	};
	setTimeout(Model.updateSlug, 5000);
};
