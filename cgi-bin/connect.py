#!/usr/bin/python
import socket
import cgitb

cgitb.enable()
print("Content-Type: text/html\n")

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(("127.0.0.1", 5005))
sock.send("1".encode('ascii'))
con = True
while con:
	buf = sock.recv(1024)
	if buf:
		print (buf.decode('ascii'))
		con = False
sock.close()
