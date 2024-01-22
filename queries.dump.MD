```
query TypologyTree {
  t1S {
    data {
      attributes {
        n
        t_2s {
					data {
            attributes {
              n
            }
          }
        }
      }
    }
  }
}
```

```
# Write your query or mutation here
query Archive($pagination:PaginationArg, $sort:[String], $filters:ArchiveFiltersInput) {
  archives(pagination: $pagination, sort: $sort, filters: $filters) {
    data {
      id
      attributes {
        updatedAt
        description
        year
        apartment
        colors {
          data {
            id
            attributes {
              name
            }
          }
        }
        # suit {
        #   data {
        #     attributes {
        #       archives {
        #         data {
        #           attributes {
        #             description
        #           }
        #         }
        #       }
        #     }
        #   }
        # }
        # t_1 {
        #   data {
        #     attributes {
        #       name
        #     }
        #   }
        # }
        # t_2 {
        #   data {
        #     attributes {
        #       name
        #     }
        #   }
        # }
      }
    }
    meta {
      pagination {
        total
        page
        pageSize
        pageCount

      }
    }
  }
}

{
  "filters": {"and":[{"t_1":{"id":{"eq":2}}}]},
  "pagination": {"pageSize": 10, "page": 1},
  "sort": []
}

```
