import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  login, register,
  resendVerificationEmail, forgotPassword,
} from '../services/apiService';
import { COLORS } from '../constants/colors';
import { isOnboardingComplete } from '../hooks/useStudentProfile';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const loginSchema = Yup.object({
  email: Yup.string()
    .matches(EMAIL_REGEX, 'Enter a valid email address (e.g. name@gmail.com)')
    .required('Email is required'),
  password: Yup.string().min(6, 'At least 6 characters').required('Password is required'),
});

const registerSchema = Yup.object({
  name: Yup.string().min(2, 'Name is too short').required('Name is required'),
  email: Yup.string()
    .matches(EMAIL_REGEX, 'Enter a valid email address (e.g. name@gmail.com)')
    .required('Email is required'),
  password: Yup.string().min(6, 'At least 6 characters').required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

const forgotSchema = Yup.object({
  email: Yup.string()
    .matches(EMAIL_REGEX, 'Enter a valid email address')
    .required('Email is required'),
});

function Field({ label, error, touched, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, touched && error && styles.inputError]}
        placeholderTextColor={COLORS.textLight}
        {...props}
      />
      {touched && error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ── FORGOT PASSWORD VIEW ──
function ForgotPasswordView({ onBack }) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerError('');
    try {
      await forgotPassword(values.email.trim());
      setSent(true);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Check your email</Text>
        <Text style={styles.infoBody}>
          If an account exists with that email, we have sent a password reset link.
          Check your inbox and spam folder.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={onBack}>
          <Text style={styles.linkBtnText}>← Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.forgotTitle}>Reset password</Text>
      <Text style={styles.forgotSub}>
        Enter your email and we will send you a reset link.
      </Text>
      <Formik
        initialValues={{ email: '' }}
        validationSchema={forgotSchema}
        onSubmit={handleSubmit}
      >
        {({ handleChange, handleBlur, handleSubmit: submit, values, errors, touched, isSubmitting }) => (
          <View>
            <Field
              label="Email address"
              placeholder="you@example.com"
              value={values.email}
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              error={errors.email}
              touched={touched.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {serverError ? (
              <View style={styles.serverError}>
                <Text style={styles.serverErrorText}>{serverError}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={styles.submitBtnText}>Send reset link →</Text>}
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </View>
  );
}

// ── MAIN SCREEN ──
export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [serverError, setServerError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerError('');
    setUnverifiedEmail(null);

    try {
      if (mode === 'login') {
        const data = await login(values.email.trim(), values.password);
        if (data.user?.is_admin) {
          navigation.replace('AdminTabs');
          return;
        }
        const onboardingDone = await isOnboardingComplete();
        navigation.replace(onboardingDone ? 'MainTabs' : 'Onboarding');
      } else {
        const data = await register(values.name.trim(), values.email.trim(), values.password);
        if (data.emailDeliveryFailed) {
          setMode('login');
          setUnverifiedEmail(data.email || values.email.trim());
          setServerError(data.error || 'Account created, but the verification email could not be sent. Please try resending it later.');
        } else {
          setRegisterSuccess(true);
        }
      }
    } catch (err) {
      const msg = err.message || 'Something went wrong. Please try again.';
      // Backend sends { error, verified: false, email } for unverified accounts
      if (msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('not verified')) {
        setUnverifiedEmail(values.email.trim());
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerificationEmail(unverifiedEmail);
      setResendSent(true);
    } catch (err) {
      setServerError(err.message || 'Could not resend verification email. Try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const switchMode = (next) => {
    setServerError('');
    setUnverifiedEmail(null);
    setRegisterSuccess(false);
    setResendSent(false);
    setMode(next);
  };

  // ── Register success state ──
  if (registerSuccess) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Account created!</Text>
            <Text style={styles.infoBody}>
              We sent a verification link to your email.{'\n'}
              Please check your inbox (and spam folder) and click the link to activate your account.
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => switchMode('login')}>
              <Text style={styles.submitBtnText}>Go to Login →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode !== 'forgot' && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* Logo */}
          {mode !== 'forgot' && (
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoWordmark}>CJ</Text>
              </View>
              <Text style={styles.appName}>CrackJAMB</Text>
              <Text style={styles.tagline}>
                {mode === 'login' ? 'Welcome back! Ka yi kyau!' : 'Create your free account'}
              </Text>
            </View>
          )}

          {/* Forgot password view */}
          {mode === 'forgot' && (
            <ForgotPasswordView onBack={() => switchMode('login')} />
          )}

          {mode !== 'forgot' && (
            <>
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'login' && styles.tabActive]}
                  onPress={() => switchMode('login')}
                >
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'register' && styles.tabActive]}
                  onPress={() => switchMode('register')}
                >
                  <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
                </TouchableOpacity>
              </View>

              {/* Unverified email banner */}
              {unverifiedEmail && (
                <View style={styles.warnBox}>
                  <Text style={styles.warnTitle}>Email not verified</Text>
                  <Text style={styles.warnBody}>
                    Please check your inbox for the verification link sent to{' '}
                    <Text style={{ fontWeight: '700' }}>{unverifiedEmail}</Text>.
                  </Text>
                  {resendSent ? (
                    <Text style={styles.resendSent}>✓ Verification email resent!</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                      <Text style={styles.resendLink}>
                        {resendLoading ? 'Sending…' : 'Resend verification email'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Form */}
              <Formik
                key={mode}
                initialValues={
                  mode === 'login'
                    ? { email: '', password: '' }
                    : { name: '', email: '', password: '', confirmPassword: '' }
                }
                validationSchema={mode === 'login' ? loginSchema : registerSchema}
                onSubmit={handleSubmit}
              >
                {({ handleChange, handleBlur, handleSubmit: submit, values, errors, touched, isSubmitting, setFieldTouched }) => (
                  <View style={styles.form}>
                    {mode === 'register' && (
                      <Field
                        label="Full name"
                        placeholder="Your full name"
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={handleBlur('name')}
                        error={errors.name}
                        touched={touched.name}
                        autoCapitalize="words"
                      />
                    )}

                    <Field
                      label="Email address"
                      placeholder="you@example.com"
                      value={values.email}
                      onChangeText={(val) => {
                        handleChange('email')(val);
                        if (touched.email) setFieldTouched('email', true, true);
                      }}
                      onBlur={handleBlur('email')}
                      error={errors.email}
                      touched={touched.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <Field
                      label="Password"
                      placeholder="Min. 6 characters"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      error={errors.password}
                      touched={touched.password}
                      secureTextEntry
                    />

                    {mode === 'register' && (
                      <Field
                        label="Confirm password"
                        placeholder="Re-enter your password"
                        value={values.confirmPassword}
                        onChangeText={handleChange('confirmPassword')}
                        onBlur={handleBlur('confirmPassword')}
                        error={errors.confirmPassword}
                        touched={touched.confirmPassword}
                        secureTextEntry
                      />
                    )}

                    {serverError ? (
                      <View style={styles.serverError}>
                        <Text style={styles.serverErrorText}>{serverError}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                      onPress={submit}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      {isSubmitting
                        ? <ActivityIndicator color="#ffffff" />
                        : <Text style={styles.submitBtnText}>
                            {mode === 'login' ? 'Login →' : 'Create Account →'}
                          </Text>
                      }
                    </TouchableOpacity>

                    {mode === 'login' && (
                      <>
                        <TouchableOpacity
                          style={styles.forgotLink}
                          onPress={() => switchMode('forgot')}
                        >
                          <Text style={styles.forgotLinkText}>Forgot password?</Text>
                        </TouchableOpacity>
                        <Text style={styles.adminHint}>Admins sign in here with an admin account.</Text>
                      </>
                    )}
                  </View>
                )}
              </Formik>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F7F5' },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },

  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backText: { color: COLORS.secondary, fontWeight: '700', fontSize: 14 },

  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoWordmark: {
    color: COLORS.textWhite, fontSize: 24, fontWeight: '900', letterSpacing: 1,
  },
  appName: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, marginBottom: 4 },
  tagline: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 4, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontWeight: '700', color: COLORS.textMuted, fontSize: 14 },
  tabTextActive: { color: '#ffffff' },

  form: { gap: 4 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
    fontSize: 15, color: COLORS.textPrimary,
  },
  inputError: { borderColor: '#e74c3c', backgroundColor: '#fdf0f0' },
  fieldError: { color: '#e74c3c', fontSize: 12, marginTop: 4, marginLeft: 4 },

  serverError: {
    backgroundColor: '#fdf0f0', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#f5c6cb', marginBottom: 4,
  },
  serverErrorText: { color: '#c0392b', fontSize: 13, textAlign: 'center' },

  // Unverified email warning
  warnBox: {
    backgroundColor: '#fff8e1', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#ffe082', marginBottom: 16,
  },
  warnTitle: { fontSize: 14, fontWeight: '800', color: '#7a4c09', marginBottom: 4 },
  warnBody: { fontSize: 13, color: '#7a4c09', lineHeight: 19, marginBottom: 8 },
  resendLink: { color: COLORS.secondary, fontWeight: '700', fontSize: 13 },
  resendSent: { color: '#27ae60', fontWeight: '700', fontSize: 13 },

  submitBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 15,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: COLORS.disabled },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },

  forgotLink: { alignItems: 'center', marginTop: 14 },
  forgotLinkText: { color: COLORS.secondary, fontWeight: '600', fontSize: 13 },
  adminHint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Forgot password view
  forgotTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary, marginBottom: 8, marginTop: 16 },
  forgotSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },

  // Info/success box
  infoBox: {
    alignItems: 'center', padding: 24,
    backgroundColor: '#F3F7F5', borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    marginTop: 40,
  },
  infoTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  infoBody: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  linkBtn: { marginTop: 8 },
  linkBtnText: { color: COLORS.secondary, fontWeight: '700', fontSize: 14 },
});
