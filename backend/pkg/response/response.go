package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PageData struct {
	List  interface{} `json:"list"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Size  int         `json:"size"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

func OKWithPage(c *gin.Context, list interface{}, total int64, page, size int) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: PageData{
			List:  list,
			Total: total,
			Page:  page,
			Size:  size,
		},
	})
}

func Fail(c *gin.Context, httpCode int, message string) {
	c.JSON(httpCode, Response{
		Code:    -1,
		Message: message,
	})
}

func BadRequest(c *gin.Context, message string) {
	Fail(c, http.StatusBadRequest, message)
}

func Unauthorized(c *gin.Context, message string) {
	Fail(c, http.StatusUnauthorized, message)
}

func NotFound(c *gin.Context, message string) {
	Fail(c, http.StatusNotFound, message)
}

func ServerError(c *gin.Context, message string) {
	Fail(c, http.StatusInternalServerError, message)
}
