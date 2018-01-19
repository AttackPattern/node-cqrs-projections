import jwt from 'jsonwebtoken';
import Identity from './identity';

export default class AuthTokenMapper {
  constructor({ secret }) {
    this.secret = secret;
  }

  verify = async token => new Identity(
    await jwt.verify((await jwt.verify(token, this.secret)).identity, this.secret)
  )
}
