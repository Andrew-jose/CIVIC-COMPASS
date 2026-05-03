export interface ISecretsManager {
  /**
   * Retrieves a secret by name.
   * @param name - The secret name
   * @returns The secret value
   */
  getSecret(name: string): Promise<string>;
}
