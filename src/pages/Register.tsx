import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import UUID from 'react-native-uuid';
import { clearAllProfileCache } from '../components/NewsItem';
const SquibApi = require('../api');

interface UserData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface Props {
  navigation?: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Lobster-Regular',
    color: '#44C1AF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 0.48,
  },
  registerButton: {
    backgroundColor: '#44C1AF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  loadingText: {
    color: '#44C1AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default class Register extends Component<
  Props,
  {
    userData: UserData;
    error: string;
    isLoading: boolean;
  }
> {
  private api: typeof SquibApi;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      userData: {
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      },
      error: '',
      isLoading: false,
    };
  }

  _handleInputChange = (field: keyof UserData, value: string) => {
    this.setState(prevState => ({
      userData: {
        ...prevState.userData,
        [field]: value,
      },
      error: '', // Clear error when user starts typing
    }));
  };

  _validateForm = (): boolean => {
    const { userData } = this.state;

    if (
      !userData.email ||
      !userData.password ||
      !userData.confirmPassword ||
      !userData.firstName ||
      !userData.lastName
    ) {
      this.setState({ error: 'All fields are required' });
      return false;
    }

    if (!userData.email.includes('@')) {
      this.setState({ error: 'Please enter a valid email address' });
      return false;
    }

    if (userData.password.length < 6) {
      this.setState({ error: 'Password must be at least 6 characters long' });
      return false;
    }

    if (userData.password !== userData.confirmPassword) {
      this.setState({ error: 'Passwords do not match' });
      return false;
    }

    return true;
  };

  _handleRegister = async () => {
    if (!this._validateForm()) {
      return;
    }

    this.setState({ isLoading: true, error: '' });

    try {
      const { userData } = this.state;

      // Generate a unique user ID
      const userId = UUID.v4().toString();

      // Create user object
      const userInfo = {
        uuid: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: `${userData.firstName} ${userData.lastName}`,
        profilePhoto: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store user info locally
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));

      // Clear profile cache
      clearAllProfileCache();

      // Navigate to main app
      this.props.navigation?.navigate('News');
    } catch (error) {
      console.error('Registration error:', error);
      this.setState({
        error: 'Registration failed. Please try again.',
        isLoading: false,
      });
    }
  };

  render() {
    const { userData, error, isLoading } = this.state;

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 120}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={[styles.textInput, styles.nameInput]}
                value={userData.firstName}
                onChangeText={text =>
                  this._handleInputChange('firstName', text)
                }
                placeholder="Enter your first name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={[styles.textInput, styles.nameInput]}
                value={userData.lastName}
                onChangeText={text => this._handleInputChange('lastName', text)}
                placeholder="Enter your last name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={userData.email}
                onChangeText={text => this._handleInputChange('email', text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={userData.password}
                onChangeText={text => this._handleInputChange('password', text)}
                placeholder="Create a password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.textInput}
                value={userData.confirmPassword}
                onChangeText={text =>
                  this._handleInputChange('confirmPassword', text)
                }
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.registerButton}
              onPress={this._handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {isLoading && (
              <Text style={styles.loadingText}>Setting up your account...</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}
