import jwt from 'jsonwebtoken';
import Identity from './identity';

export default class AuthTokenMapper {
  constructor({ secret, decorator = token => token }) {
    this.secret = secret;
    this.decorator = decorator;
  }

  verify = async token => this.decorator(new Identity(
    await jwt.verify((await jwt.verify(token, this.secret)).identity, this.secret)
  ))
}
