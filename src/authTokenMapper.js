import jwt from 'jsonwebtoken';

export default class AuthTokenMapper {
  constructor({ secret, identityMapper }) {
    this.secret = secret;
    this.identityMapper = identityMapper;
  }

  verify = async token => this.identityMapper(
    await jwt.verify((await jwt.verify(token, this.secret)).identity, this.secret)
  )
}
