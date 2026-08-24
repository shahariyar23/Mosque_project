/**
 * What an access token carries.
 *
 * Only `sub`. Role and permissions are deliberately *not* in the token: they are read from the row on
 * each request, so demoting someone or suspending an account takes effect on their next call rather
 * than whenever their token happens to expire. A token that carried a permission set would be a
 * snapshot of authority that outlives the decision to remove it.
 *
 * The phase that issues tokens owns the signing side of this contract; the fields below are what the
 * strategy needs in order to identify a person, and nothing more.
 */
export interface AccessTokenPayload {
  /** The user id. The standard JWT subject claim. */
  sub: string;
  /** Added by the signer, verified by the strategy. Present on any real token. */
  iat?: number;
  exp?: number;
}
