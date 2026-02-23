start:
	docker run -d --name clock --rm -p 8080:80 -v $$(pwd)/.:/usr/share/nginx/html/ nginx

stop:
	docker stop clock

.PHONY: local
