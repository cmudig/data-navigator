# Example Dataset

For this tutorial, we'll use a simple dataset with 4 data points.

## The Data

```js
const data = [
  { fruit: 'apple', store: 'a', cost: 3 },
  { fruit: 'banana', store: 'a', cost: 0.75 },
  { fruit: 'apple', store: 'b', cost: 2.75 },
  { fruit: 'banana', store: 'b', cost: 1.25 }
]
```

| Fruit | Store | Cost |
|-------|-------|------|
| Apple | A | $3.00 |
| Banana | A | $0.75 |
| Apple | B | $2.75 |
| Banana | B | $1.25 |

## Why This Dataset?

This dataset is perfect for learning because:

1. **It's small** — With only 4 nodes, you can see exactly how they connect.
2. **It has multiple dimensions** — You could navigate by fruit, store, or cost.
3. **It maps to a stacked bar chart** — A common visualization type.

## Thinking About Structure

Before writing code, consider how users might navigate:

- **As a list** — Move through all 4 points sequentially
- **By fruit** — Jump between apples, then bananas
- **By store** — Explore all items in store A, then B
- **By value** — Navigate from lowest to highest cost

Data Navigator lets you implement any of these patterns.

## Next Steps

Now let's create a [visualization](/getting-started/visualization) of this data.
