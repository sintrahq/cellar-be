# HOW TO

creare il database in locale chiamato: cantina-strapi con collation utf8mb4_general_ci

run docker from terminal:
docker-compose -f docker/stack.yml up

# URLS

graphQl playground: http://localhost:1337/graphql
mysql adminer: http://localhost:8080/
swagger: http://localhost:1337/documentation/v1.0.0#/

# ENVS

# mock data

to generate mock data for archive run this GET: http://localhost:1337/api/seeds/archives

to delete those mock data run this Mysql query:
DELETE FROM `archives` WHERE is_mock = true;
