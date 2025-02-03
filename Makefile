CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -I./include
LDFLAGS = -lcurl

# Source files
SRCS = $(wildcard src/*.cpp) \
       $(wildcard src/*/*.cpp)

# Object files
OBJS = $(SRCS:.cpp=.o)

# Binary name
TARGET = trader

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(OBJS) -o $(TARGET) $(LDFLAGS)

# Rule for .cpp files
%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)