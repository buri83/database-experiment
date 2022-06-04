start:
	docker-compose build
	docker-compose up -d mq
	docker-compose up -d

log-point:
	docker-compose logs -f point-service

log-credit-card:
	docker-compose logs -f credit-card-service

log-user:
	docker-compose logs -f user-service