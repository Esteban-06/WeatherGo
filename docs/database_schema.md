# WeatherGo Database Schema

WeatherGo stores each user's wardrobe as clothing item records associated through
`user_clothing_items`. This normalized design represents the requested
"Clothing Items" field as a relationship instead of storing multiple values in a
single text field.

## Tables

### `users`

| Column | Type | Constraints |
| --- | --- | --- |
| `user_id` | `INTEGER` | Primary key |
| `username` | `TEXT` | Required and unique |

### `clothing_items`

| Column | Type | Constraints |
| --- | --- | --- |
| `clothing_item_id` | `INTEGER` | Primary key |
| `clothing_name` | `TEXT` | Required |
| `is_pant` | `INTEGER` | Boolean: `0` or `1` |
| `is_long_sleeve_shirt` | `INTEGER` | Boolean: `0` or `1` |
| `is_short_sleeve_shirt` | `INTEGER` | Boolean: `0` or `1` |
| `is_short` | `INTEGER` | Boolean: `0` or `1` |
| `is_jacket` | `INTEGER` | Boolean: `0` or `1` |
| `is_hoodie` | `INTEGER` | Boolean: `0` or `1` |
| `is_breathable` | `INTEGER` | Boolean: `0` or `1` |
| `is_warming` | `INTEGER` | Boolean: `0` or `1` |
| `is_cooling` | `INTEGER` | Boolean: `0` or `1` |

SQLite represents booleans as integers. Each boolean column is constrained to
`0` (`false`) or `1` (`true`) and defaults to `0`.

### `user_clothing_items`

This join table connects users to their clothing items. The composite primary
key prevents the same item from being assigned to the same user more than once.
Foreign keys cascade when a user or clothing item is deleted.

## Example query

```sql
SELECT ci.*
FROM clothing_items AS ci
JOIN user_clothing_items AS uci
  ON uci.clothing_item_id = ci.clothing_item_id
WHERE uci.user_id = ?;
```
