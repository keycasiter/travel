package httpx

import "github.com/gin-gonic/gin"

type Envelope struct {
	Data  any        `json:"data,omitempty"`
	Error *ErrorBody `json:"error,omitempty"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func OK(c *gin.Context, data any) {
	c.JSON(200, Envelope{Data: data})
}

func Fail(c *gin.Context, status int, code string, message string) {
	c.JSON(status, Envelope{Error: &ErrorBody{Code: code, Message: message}})
}
