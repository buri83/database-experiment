up:
	docker-compose down
	docker-compose up postgres -d

init:
	docker-compose exec --user postgres postgres bash /app/init.sh

sh:
	docker-compose exec postgres sh

test:
	docker-compose run test

init-test:
	make init
	make test
	
psql:
	docker-compose exec --user postgres postgres psql