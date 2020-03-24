# loopback-mixin-slug
Creates slugs for documents and retrieve documents by slugs. 

# Install

```bash
npm i loopback-mixin-slug -s
```

In the `mixins` property to your `server/model-config.json` add `../node_modules/loopback-mixin-slug`:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../common/mixins",
      "../node_modules/loopback-mixin-slug"
    ]
  }
}
```

# Usage


To use with your Models in the `mixins` attribute of your model config put Slug.

```json
 {
  "name": "ModelName",
  "mixins": {
    "Slug": {
      "fields": [
        "title"
      ]
    }
  },
  "properties": {
    "title": {
      "type": "string"
    }
  }
}
```

# License
The MIT License (MIT). Please see [License File](LICENSE) for more information.
