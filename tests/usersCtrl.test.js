const User = require('../models/user'); // Zaimportuj model User
const jwt = require('jsonwebtoken');
const { userLogin } = require('../controller/usersCtrl');

// Mockowanie obiektu żądania (req) i odpowiedzi (res)
const req = {
  body: {
    email: 'test@wp.pl',
    password: 'ee34@341',
  },
};

const res = {
  json: jest.fn(),
};

// Tworzenie mocka funkcji next
const next = jest.fn();

describe('Auth Controller - userLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Czyszczenie mocków po każdym teście
  });

  it('should return status 200 and a token with user object', async () => {
    const validPasswordMock = jest.fn().mockReturnValue(true); // Mockowanie poprawnej metody validPassword

    // Mockowanie metody findOne z modelu User
    User.findOne = jest.fn().mockResolvedValue({
      email: 'test@wp.pl',
      validPassword: validPasswordMock,
      save: jest.fn().mockResolvedValue(),
    });

    // Mockowanie funkcji sign z biblioteki jsonwebtoken
    jwt.sign = jest.fn().mockReturnValue('mocked_token');

    // Wywołanie kontrolera
    await userLogin(req, res, next);

    //This test is not working

    expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        code: 200,
        data: {
          token: "mocked_token",
        },
      });

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@wp.pl' });
    expect(validPasswordMock).toHaveBeenCalledWith('ee34@341');
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: expect.any(String), email: 'test@wp.pl', password: expect.any(String) },
      expect.any(String),
      { expiresIn: '1h' }
    );
  });

  it('should return status 400 for incorrect login/password', async () => {
    const validPasswordMock = jest.fn().mockReturnValue(false); // Mockowanie niepoprawnej metody validPassword

    User.findOne = jest.fn().mockResolvedValue({
      email: 'test@wp.pl',
      validPassword: validPasswordMock,
    });

    await userLogin(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 400,
      data: 'Bad request',
      message: 'Incorrect login/password',
    });
  });

  it('should call next with error for any other error', async () => {
    const errorMock = new Error('Some error');

    User.findOne = jest.fn().mockRejectedValue(errorMock);

    await userLogin(req, res, next);

    expect(next).toHaveBeenCalledWith(errorMock);
  });
});
