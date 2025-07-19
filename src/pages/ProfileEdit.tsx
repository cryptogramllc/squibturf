import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
const SquibApi = require('../api');

interface Props {
  navigation?: any;
  route?: any;
}

interface State {
  displayName: string;
  bio: string;
  profilePicture: string | null;
  isLoading: boolean;
}

export default class ProfileEdit extends Component<Props, State> {
  private api: any;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();

    // Get user data from route params
    const userData = props.route?.params?.userData || {};

    this.state = {
      displayName: userData.displayName || userData.name || '',
      bio: userData.bio || '',
      profilePicture: userData.photo || null,
      isLoading: false,
    };
  }

  async componentDidMount() {
    await this.loadFreshUserData();
  }

  loadFreshUserData = async () => {
    try {
      // Get fresh user data from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      const userData = user ? JSON.parse(user) : null;

      if (userData) {
        this.setState({
          displayName: userData.displayName || userData.name || '',
          bio: userData.bio || '',
          profilePicture: userData.photo || null,
        });
      }
    } catch (error) {
      // Silent error handling
    }
  };

  selectImageFromLibrary = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 500,
      maxHeight: 500,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to select image from library');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          this.setState({ profilePicture: imageUri });
        }
      }
    });
  };

  takePhoto = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 500,
      maxHeight: 500,
    };

    launchCamera(options, response => {
      if (response.didCancel) {
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to take photo');
      } else if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          this.setState({ profilePicture: imageUri });
        }
      } else {
      }
    });
  };

  showImagePickerOptions = () => {
    Alert.alert('Update Profile Picture', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: this.takePhoto,
      },
      {
        text: 'Choose from Library',
        onPress: this.selectImageFromLibrary,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  handleSaveProfile = async () => {
    const { displayName, bio, profilePicture } = this.state;
    const { navigation } = this.props;

    if (!displayName.trim()) {
      Alert.alert('Profile Incomplete', 'Please enter a display name.');
      return;
    }

    this.setState({ isLoading: true });

    try {
      // Get fresh user data from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      const userData = user ? JSON.parse(user) : null;

      if (!userData) {
        Alert.alert('Error', 'User data not found. Please try again.');
        return;
      }

      // Create updated user profile
      const updatedUserData = {
        ...userData,
        displayName: displayName.trim(),
        bio: bio.trim(),
        photo: profilePicture,
        profileCompleted: true,
      };

      // Send to backend API first
      const apiResponse = await this.api.sendProfile(updatedUserData);

      // Only save to AsyncStorage after successful API call
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserData));

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to News page and show Profile modal
            navigation?.navigate('News');
            // The App component will handle showing the Profile modal
          },
        },
      ]);
    } catch (error) {
      // If API call fails, don't update AsyncStorage to preserve user session
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { displayName, bio, profilePicture, isLoading } = this.state;
    const Icon: any = FontAwesome;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // Navigate back to News page and show Profile modal
              this.props.navigation?.navigate('News');
              // The App component will handle showing the Profile modal
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#44C1AF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        <View style={styles.form}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureContainer}>
            <Text style={styles.label}>Profile Picture</Text>
            <TouchableOpacity
              onPress={this.showImagePickerOptions}
              style={styles.profilePictureButton}
            >
              {profilePicture ? (
                <Image
                  source={{
                    uri: (() => {
                      const photoUrl =
                        profilePicture &&
                        profilePicture.includes(
                          'squibturf-images.s3.amazonaws.com'
                        )
                          ? profilePicture.replace(
                              'squibturf-images.s3.amazonaws.com',
                              'squibturf-images.s3.us-east-1.amazonaws.com'
                            )
                          : profilePicture;
                      // Ensure the URL has the correct format with double slash
                      const finalPhotoUrl =
                        photoUrl &&
                        photoUrl.includes(
                          'squibturf-images.s3.us-east-1.amazonaws.com'
                        ) &&
                        !photoUrl.includes('//profile-')
                          ? photoUrl.replace(
                              'squibturf-images.s3.us-east-1.amazonaws.com/',
                              'squibturf-images.s3.us-east-1.amazonaws.com//'
                            )
                          : photoUrl;
                      return finalPhotoUrl;
                    })(),
                  }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Icon name="camera" size={40} color="#999" />
                  <Text style={styles.profilePictureText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Icon name="edit" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Display Name *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={text => this.setState({ displayName: text })}
              placeholder="Enter your display name"
              placeholderTextColor="#999"
              maxLength={30}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={text => this.setState({ bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={this.handleSaveProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Saving...</Text>
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              // Navigate back to News page and show Profile modal
              this.props.navigation?.navigate('News');
              // The App component will handle showing the Profile modal
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#44C1AF',
  },
  form: {
    paddingHorizontal: 20,
    flex: 1,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#44C1AF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureButton: {
    position: 'relative',
    marginTop: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#44C1AF',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#44C1AF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
});
